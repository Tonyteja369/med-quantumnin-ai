/**
 * Browser-side parser for PhysioNet WFDB records (format 212 only).
 *
 * RULE 1 compliance: this module reads ONLY real .hea + .dat files
 * fetched from /public/wfdb. It does not synthesize anything.
 *
 * Format 212 packing (per WFDB spec): every 3 bytes encode 2 signed
 * 12-bit samples interleaved across channels:
 *   byte0           = low 8 bits of sample A
 *   byte1 low4 nib  = high 4 bits of sample A
 *   byte1 high4 nib = high 4 bits of sample B
 *   byte2           = low 8 bits of sample B
 * Sample order is sample0_ch0, sample0_ch1, sample1_ch0, sample1_ch1, ...
 * (multiplexed across channels, then time).
 *
 * ADC conversion (mandatory per RULE 3):
 *   physical_mV = (raw_adc - baseline) / adc_gain
 */

import type { LeadData } from "@/types/ecg.types";

export interface ParsedHeader {
  recordName: string;
  numSignals: number;
  samplingRate: number;
  numSamples: number;
  signals: SignalSpec[];
}

export interface SignalSpec {
  filename: string;
  format: number;
  adcGain: number;
  adcResolution: number;
  adcZero: number;
  initialValue: number;
  checksum: number;
  blockSize: number;
  description: string; // lead name (e.g. MLII, V5, ECG1)
  baseline: number;
  units: string;
}

export interface ParsedRecord {
  header: ParsedHeader;
  leads: LeadData[];
}

export function parseHeader(text: string, recordName: string): ParsedHeader {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    throw new Error(`Empty header for ${recordName}`);
  }

  // Record line: "<rec> <nsig> <fs> <nsamp> [base time/date]"
  const recParts = lines[0].split(/\s+/);
  const numSignals = parseInt(recParts[1], 10);
  const samplingRate = parseFloat(recParts[2]);
  const numSamples = parseInt(recParts[3], 10);

  if (!Number.isFinite(samplingRate) || samplingRate <= 0) {
    throw new Error(`Bad sampling rate in header for ${recordName}`);
  }
  if (!Number.isFinite(numSamples) || numSamples <= 0) {
    throw new Error(`Bad sample count in header for ${recordName}`);
  }

  const signals: SignalSpec[] = [];
  for (let i = 1; i <= numSignals && i < lines.length; i++) {
    const p = lines[i].split(/\s+/);
    // <file> <fmt> <gain[(baseline)/units]> <res> <zero> <init> <chk> <block> <desc>
    const filename = p[0];
    const format = parseInt(p[1], 10);

    // Gain field can be "200", "200(1024)", or "200(1024)/mV"
    const gainField = p[2] ?? "200";
    let adcGain = 200;
    let baseline = NaN;
    let units = "mV";
    const gainMatch = gainField.match(
      /^([-\d.eE+]+)(?:\(([-\d]+)\))?(?:\/(\S+))?/
    );
    if (gainMatch) {
      adcGain = parseFloat(gainMatch[1]) || 200;
      if (gainMatch[2] !== undefined) baseline = parseInt(gainMatch[2], 10);
      if (gainMatch[3]) units = gainMatch[3];
    }
    const adcResolution = parseInt(p[3] ?? "12", 10);
    const adcZero = parseInt(p[4] ?? "0", 10);
    if (!Number.isFinite(baseline)) baseline = adcZero;
    const initialValue = parseInt(p[5] ?? "0", 10);
    const checksum = parseInt(p[6] ?? "0", 10);
    const blockSize = parseInt(p[7] ?? "0", 10);
    const description = p.slice(8).join(" ") || `ch${i}`;

    if (format !== 212) {
      throw new Error(
        `Unsupported WFDB format ${format} for ${filename}. Only 212 is implemented.`
      );
    }

    signals.push({
      filename,
      format,
      adcGain,
      adcResolution,
      adcZero,
      initialValue,
      checksum,
      blockSize,
      description,
      baseline,
      units,
    });
  }

  return { recordName, numSignals, samplingRate, numSamples, signals };
}

/**
 * Decode a format-212 .dat byte buffer into per-channel physical signals.
 * Performs the mandatory ADC conversion.
 */
export function decodeFormat212(
  buffer: ArrayBuffer,
  header: ParsedHeader
): number[][] {
  const bytes = new Uint8Array(buffer);
  const numSignals = header.numSignals;
  if (numSignals < 1) throw new Error("No signals declared in header");

  // Total samples we can decode (across channels), as multiples of 2.
  const totalPairs = Math.floor(bytes.length / 3);
  const totalSamples = totalPairs * 2;
  const samplesPerChannel = Math.min(
    Math.floor(totalSamples / numSignals),
    header.numSamples
  );

  const channels: number[][] = Array.from(
    { length: numSignals },
    () => new Array<number>(samplesPerChannel)
  );

  let chanIdx = 0;
  let sampIdx = 0;
  let written = 0;
  const target = samplesPerChannel * numSignals;

  for (let i = 0; i + 2 < bytes.length && written < target; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    // Sample A: low 8 bits = b0, high 4 bits = low nibble of b1
    let a = ((b1 & 0x0f) << 8) | b0;
    if (a & 0x800) a -= 0x1000; // sign-extend 12-bit

    // Sample B: low 8 bits = b2, high 4 bits = high nibble of b1
    let bSamp = ((b1 & 0xf0) << 4) | b2;
    if (bSamp & 0x800) bSamp -= 0x1000;

    for (const raw of [a, bSamp]) {
      if (sampIdx >= samplesPerChannel) break;
      const spec = header.signals[chanIdx];
      const physical = (raw - spec.baseline) / (spec.adcGain || 1);
      channels[chanIdx][sampIdx] = physical;
      written++;
      chanIdx++;
      if (chanIdx >= numSignals) {
        chanIdx = 0;
        sampIdx++;
      }
    }
  }

  return channels;
}

/**
 * RULE 2: validate a decoded signal is real, non-flat, sane amplitude.
 * Throws (loudly) if the signal looks fake or broken.
 */
export function validateSignalIsUnique(
  signal: number[],
  recordKey: string,
  expectedHrRange?: [number, number]
): void {
  if (!signal || signal.length < 100) {
    throw new Error(`Signal for ${recordKey} too short: ${signal?.length ?? 0}`);
  }
  const n = signal.length;
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (signal[i] - mean) ** 2;
  const std = Math.sqrt(variance / n);

  if (std < 0.01) {
    throw new Error(
      `Signal for ${recordKey} is flat. std=${std.toFixed(6)}. ADC conversion failed.`
    );
  }
  if (std > 20.0) {
    throw new Error(
      `Signal for ${recordKey} amplitude unrealistic. std=${std.toFixed(2)}. Units may be wrong.`
    );
  }
  const first = signal.slice(0, 100);
  if (first.every((v) => v === first[0])) {
    throw new Error(
      `Signal for ${recordKey} is constant value ${first[0]}. Not real ECG.`
    );
  }
  void expectedHrRange; // reserved for future HR range check
}

export async function fetchAndParseWFDB(
  recordName: string,
  basePath = "/wfdb"
): Promise<ParsedRecord> {
  const heaUrl = `${basePath}/${recordName}.hea`;
  const datUrl = `${basePath}/${recordName}.dat`;

  const [heaRes, datRes] = await Promise.all([fetch(heaUrl), fetch(datUrl)]);
  if (!heaRes.ok) throw new Error(`Failed to fetch ${heaUrl}: ${heaRes.status}`);
  if (!datRes.ok) throw new Error(`Failed to fetch ${datUrl}: ${datRes.status}`);

  const heaText = await heaRes.text();
  const datBuf = await datRes.arrayBuffer();
  const header = parseHeader(heaText, recordName);
  const channels = decodeFormat212(datBuf, header);

  const leads: LeadData[] = channels.map((sig, i) => ({
    name: header.signals[i]?.description ?? `ch${i + 1}`,
    signal: sig,
    unit: header.signals[i]?.units ?? "mV",
  }));

  // Validate every channel
  for (const lead of leads) {
    validateSignalIsUnique(lead.signal, `${recordName}/${lead.name}`);
  }

  return { header, leads };
}

/**
 * Parse a CSV file uploaded by the user. Accepted shapes:
 *   - Single column of numeric samples (1 lead).
 *   - Multiple comma-separated columns, each a lead. First row may be a header.
 * Returns leads as physical units (mV assumed). No fake fallback.
 */
export function parseCsvECG(text: string, samplingRate = 360): {
  leads: LeadData[];
  samplingRate: number;
} {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (rows.length === 0) throw new Error("CSV is empty");

  const splitRow = (r: string) => r.split(/[,;\t]/).map((s) => s.trim());

  // Detect header row: any non-numeric token in row 0
  const firstCells = splitRow(rows[0]);
  const headerLooksTextual = firstCells.some(
    (c) => c !== "" && Number.isNaN(Number(c))
  );
  const headerNames = headerLooksTextual ? firstCells : null;
  const dataRows = headerLooksTextual ? rows.slice(1) : rows;

  if (dataRows.length < 100) {
    throw new Error(
      `CSV has only ${dataRows.length} samples, need at least 100 for analysis.`
    );
  }

  const numCols = splitRow(dataRows[0]).length;
  const cols: number[][] = Array.from({ length: numCols }, () => []);
  for (const row of dataRows) {
    const parts = splitRow(row);
    for (let c = 0; c < numCols; c++) {
      const v = Number(parts[c]);
      if (Number.isFinite(v)) cols[c].push(v);
    }
  }

  const leads: LeadData[] = cols.map((sig, i) => ({
    name: headerNames?.[i] || `Lead ${i + 1}`,
    signal: sig,
    unit: "mV",
  }));
  for (const lead of leads) {
    validateSignalIsUnique(lead.signal, `csv/${lead.name}`);
  }
  return { leads, samplingRate };
}
