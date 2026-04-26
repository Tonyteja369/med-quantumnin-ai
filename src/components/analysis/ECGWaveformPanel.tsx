import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { LeadSelector } from "@/components/upload/LeadSelector";
import { EMPTY_DELINEATION, type DelineationData } from "@/utils/ecgDelineation";
import type { DiagnosisResult, ECGFeatures } from "@/types/ecg.types";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MAX_DISPLAY = 5000;
const CHART_HEIGHT = 320;

interface ChartPoint {
  time: number;
  value: number;
}

interface BeatAnnotations {
  /** All values in seconds. NaN where missing. Aligned by beat index. */
  p_onsets: number[];
  p_peaks: number[];
  p_offsets: number[];
  q_peaks: number[];
  r_peaks: number[];
  s_peaks: number[];
  t_onsets: number[];
  t_peaks: number[];
  t_offsets: number[];
}

interface ProblemZone {
  x1: number;
  x2: number;
  color: string;
  label: string;
  opacity: number;
}

function downsampleForChart(signal: number[], samplingRate: number): ChartPoint[] {
  const ratio = signal.length > MAX_DISPLAY ? signal.length / MAX_DISPLAY : 1;
  if (ratio === 1) {
    return signal.map((value, i) => ({
      time: Number((i / samplingRate).toFixed(4)),
      value: Number(value.toFixed(5)),
    }));
  }
  const out: ChartPoint[] = new Array(MAX_DISPLAY);
  for (let i = 0; i < MAX_DISPLAY; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < signal.length; j++) {
      sum += signal[j];
      count++;
    }
    const value = count > 0 ? sum / count : 0;
    out[i] = {
      time: Number((start / samplingRate).toFixed(4)),
      value: Number(value.toFixed(5)),
    };
  }
  return out;
}

function buildBeatAnnotations(
  raw: DelineationData,
  samplingRate: number
): BeatAnnotations {
  const conv = (arr: number[]) =>
    arr.map((v) => (Number.isFinite(v) && v >= 0 ? v / samplingRate : Number.NaN));
  return {
    p_onsets: conv(raw.p_onsets),
    p_peaks: conv(raw.p_peaks),
    p_offsets: conv(raw.p_offsets),
    q_peaks: conv(raw.q_peaks),
    r_peaks: conv(raw.r_peaks),
    s_peaks: conv(raw.s_peaks),
    t_onsets: conv(raw.t_onsets),
    t_peaks: conv(raw.t_peaks),
    t_offsets: conv(raw.t_offsets),
  };
}

function getProblemZones(
  diagnoses: DiagnosisResult[],
  beats: BeatAnnotations,
  features: ECGFeatures,
  samplingRate: number
): ProblemZone[] {
  const zones: ProblemZone[] = [];
  const hasCondition = (name: string) =>
    diagnoses.some(
      (d) =>
        d.condition.toLowerCase().includes(name.toLowerCase()) && d.confidence > 0.5
    );

  // QT prolongation: per-beat highlight where measured QT > threshold (450ms)
  if (
    hasCondition("QT Prolongation") ||
    (features.qtcInterval != null && features.qtcInterval > 450)
  ) {
    const beatCount = Math.min(beats.q_peaks.length, beats.t_offsets.length);
    let firstLabel = true;
    for (let i = 0; i < beatCount; i++) {
      const q = beats.q_peaks[i];
      const tOff = beats.t_offsets[i];
      if (!Number.isFinite(q) || !Number.isFinite(tOff) || tOff <= q) continue;
      // Use measured QT in ms — only highlight beats actually exceeding threshold
      const qtMs = (tOff - q) * 1000;
      if (qtMs <= 380) continue; // approx threshold guard; QTc check below
      zones.push({
        x1: q,
        x2: tOff,
        color: "#FF453A",
        label: firstLabel ? "Prolonged QT" : "",
        opacity: 0.12,
      });
      firstLabel = false;
    }
  }

  // Wide QRS: per-beat where measured QRS width > 120ms
  const beatCount = Math.min(beats.q_peaks.length, beats.s_peaks.length);
  let wideLabelShown = false;
  for (let i = 0; i < beatCount; i++) {
    const q = beats.q_peaks[i];
    const s = beats.s_peaks[i];
    if (!Number.isFinite(q) || !Number.isFinite(s) || s <= q) continue;
    const qrsMs = (s - q) * 1000;
    if (qrsMs <= 120) continue;
    zones.push({
      x1: q,
      x2: s,
      color: "#FF9F0A",
      label: wideLabelShown ? "" : "Wide QRS",
      opacity: 0.18,
    });
    wideLabelShown = true;
  }

  // AFib: per-beat irregular RR (>25% deviation) AND afib confidence > 0.5
  const cv = features.rrMean > 0 ? features.rrStd / features.rrMean : 0;
  if (hasCondition("Fibrillation") && cv > 0.2) {
    const meanRR = features.rrMean || 800;
    let labelShown = false;
    for (let i = 1; i < beats.r_peaks.length; i++) {
      const prevR = beats.r_peaks[i - 1];
      const r = beats.r_peaks[i];
      if (!Number.isFinite(prevR) || !Number.isFinite(r)) continue;
      const rrMs = (r - prevR) * 1000;
      if (Math.abs(rrMs - meanRR) <= meanRR * 0.25) continue;
      zones.push({
        x1: prevR,
        x2: r,
        color: "#BF5AF2",
        label: labelShown ? "" : "Irregular RR",
        opacity: 0.1,
      });
      labelShown = true;
    }
  }

  // unused samplingRate placeholder reference
  void samplingRate;
  return zones;
}

interface PlotRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface OverlayProps {
  beats: BeatAnnotations;
  problemZones: ProblemZone[];
  rect: PlotRect;
  xDomain: [number, number];
  yDomain: [number, number];
  chartData: ChartPoint[];
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "10px",
  fontFamily: "JetBrains Mono, monospace",
  fontWeight: 600,
};
const SMALL_LABEL: React.CSSProperties = {
  fontSize: "9px",
  fontFamily: "JetBrains Mono, monospace",
};

function ECGGrid({ rect, xDomain, yDomain }: { rect: PlotRect; xDomain: [number, number]; yDomain: [number, number] }) {
  // Real ECG paper: major every 200ms / 0.5mV, minor every 40ms / 0.1mV
  const xSpan = xDomain[1] - xDomain[0];
  const ySpan = yDomain[1] - yDomain[0];
  if (xSpan <= 0 || ySpan <= 0) return null;
  const pxPerSec = rect.width / xSpan;
  const pxPerMv = rect.height / ySpan;

  const minorXStep = pxPerSec * 0.04; // 40ms
  const majorXStep = pxPerSec * 0.2; // 200ms
  const minorYStep = pxPerMv * 0.1; // 0.1mV
  const majorYStep = pxPerMv * 0.5; // 0.5mV

  // Don't render too many grid lines when zoomed out
  if (minorXStep < 2 || minorYStep < 2) {
    // Only major grid
    const lines: JSX.Element[] = [];
    for (let x = 0; x <= rect.width + 0.5; x += majorXStep) {
      lines.push(
        <line key={`mx-${x}`} x1={x} y1={0} x2={x} y2={rect.height} stroke="rgba(255,80,80,0.15)" strokeWidth={0.8} />
      );
    }
    for (let y = 0; y <= rect.height + 0.5; y += majorYStep) {
      lines.push(
        <line key={`my-${y}`} x1={0} y1={y} x2={rect.width} y2={y} stroke="rgba(255,80,80,0.15)" strokeWidth={0.8} />
      );
    }
    return <g>{lines}</g>;
  }

  const lines: JSX.Element[] = [];
  // Minor first
  for (let x = 0; x <= rect.width + 0.5; x += minorXStep) {
    lines.push(
      <line key={`nx-${x.toFixed(2)}`} x1={x} y1={0} x2={x} y2={rect.height} stroke="rgba(255,80,80,0.07)" strokeWidth={0.4} />
    );
  }
  for (let y = 0; y <= rect.height + 0.5; y += minorYStep) {
    lines.push(
      <line key={`ny-${y.toFixed(2)}`} x1={0} y1={y} x2={rect.width} y2={y} stroke="rgba(255,80,80,0.07)" strokeWidth={0.4} />
    );
  }
  // Major on top
  for (let x = 0; x <= rect.width + 0.5; x += majorXStep) {
    lines.push(
      <line key={`mx-${x.toFixed(2)}`} x1={x} y1={0} x2={x} y2={rect.height} stroke="rgba(255,80,80,0.15)" strokeWidth={0.8} />
    );
  }
  for (let y = 0; y <= rect.height + 0.5; y += majorYStep) {
    lines.push(
      <line key={`my-${y.toFixed(2)}`} x1={0} y1={y} x2={rect.width} y2={y} stroke="rgba(255,80,80,0.15)" strokeWidth={0.8} />
    );
  }
  return <g>{lines}</g>;
}

function CustomECGOverlay({ beats, problemZones, rect, xDomain, yDomain, chartData }: OverlayProps) {
  const toX = (timeSec: number) => {
    const [xMin, xMax] = xDomain;
    if (xMax === xMin) return 0;
    return ((timeSec - xMin) / (xMax - xMin)) * rect.width;
  };
  const toY = (value: number) => {
    const [yMin, yMax] = yDomain;
    if (yMax === yMin) return rect.height / 2;
    return rect.height - ((value - yMin) / (yMax - yMin)) * rect.height;
  };
  const getValueAt = (t: number) => {
    if (chartData.length === 0) return 0;
    // Binary search for nearest time
    let lo = 0;
    let hi = chartData.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (chartData[mid].time < t) lo = mid + 1;
      else hi = mid;
    }
    const i = lo;
    const a = chartData[Math.max(0, i - 1)];
    const b = chartData[i];
    return Math.abs(a.time - t) <= Math.abs(b.time - t) ? a.value : b.value;
  };
  const inView = (t: number) =>
    Number.isFinite(t) && t >= xDomain[0] && t <= xDomain[1];

  // Indices of visible beats (in beat-index order) for "every 3rd beat" labeling
  const visibleBeatIdx: number[] = [];
  for (let i = 0; i < beats.r_peaks.length; i++) {
    if (inView(beats.r_peaks[i])) visibleBeatIdx.push(i);
  }
  const labelEvery3 = new Set<number>();
  for (let k = 0; k < visibleBeatIdx.length; k += 3) labelEvery3.add(visibleBeatIdx[k]);

  // First visible beat that has all required values for each bracket
  let prBeat = -1;
  let qrsBeat = -1;
  let qtBeat = -1;
  for (const i of visibleBeatIdx) {
    if (
      prBeat < 0 &&
      Number.isFinite(beats.p_onsets[i]) &&
      Number.isFinite(beats.q_peaks[i]) &&
      inView(beats.p_onsets[i]) &&
      inView(beats.q_peaks[i])
    ) {
      prBeat = i;
    }
    if (
      qrsBeat < 0 &&
      Number.isFinite(beats.q_peaks[i]) &&
      Number.isFinite(beats.s_peaks[i]) &&
      inView(beats.q_peaks[i]) &&
      inView(beats.s_peaks[i])
    ) {
      qrsBeat = i;
    }
    if (
      qtBeat < 0 &&
      Number.isFinite(beats.q_peaks[i]) &&
      Number.isFinite(beats.t_offsets[i]) &&
      inView(beats.q_peaks[i]) &&
      inView(beats.t_offsets[i])
    ) {
      qtBeat = i;
    }
    if (prBeat >= 0 && qrsBeat >= 0 && qtBeat >= 0) break;
  }

  return (
    <svg
      style={{
        position: "absolute",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* ECG paper grid */}
      <ECGGrid rect={rect} xDomain={xDomain} yDomain={yDomain} />

      {/* Problem zone highlights */}
      {problemZones.map((zone, i) => {
        if (zone.x2 < xDomain[0] || zone.x1 > xDomain[1]) return null;
        const x1 = Math.max(0, toX(zone.x1));
        const x2 = Math.min(rect.width, toX(zone.x2));
        if (x2 <= x1) return null;
        return (
          <g key={`zone-${i}`}>
            <rect x={x1} y={0} width={x2 - x1} height={rect.height} fill={zone.color} opacity={zone.opacity} rx={2} />
            {zone.label && (
              <text x={(x1 + x2) / 2} y={14} textAnchor="middle" fill={zone.color} style={LABEL_STYLE} opacity={0.95}>
                {zone.label}
              </text>
            )}
          </g>
        );
      })}

      {/* P peaks */}
      {beats.p_peaks.map((t, i) => {
        if (!inView(t)) return null;
        const x = toX(t);
        const y = toY(getValueAt(t));
        return (
          <g key={`p-${i}`}>
            <circle cx={x} cy={y} r={3} fill="none" stroke="#32D2FF" strokeWidth={1.5} opacity={0.85} />
            {labelEvery3.has(i) && (
              <text x={x} y={y - 10} textAnchor="middle" fill="#32D2FF" style={LABEL_STYLE}>
                P
              </text>
            )}
          </g>
        );
      })}

      {/* Q peaks */}
      {beats.q_peaks.map((t, i) => {
        if (!inView(t)) return null;
        const x = toX(t);
        const y = toY(getValueAt(t));
        return (
          <g key={`q-${i}`}>
            <circle cx={x} cy={y} r={2.5} fill="none" stroke="#FF9F0A" strokeWidth={1.5} opacity={0.75} />
            {i === qrsBeat && (
              <text x={x - 8} y={y + 16} textAnchor="middle" fill="#FF9F0A" style={LABEL_STYLE}>
                Q
              </text>
            )}
          </g>
        );
      })}

      {/* R peaks */}
      {beats.r_peaks.map((t, i) => {
        if (!inView(t)) return null;
        const x = toX(t);
        const y = toY(getValueAt(t));
        return (
          <g key={`r-${i}`}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={rect.height}
              stroke="rgba(48,209,88,0.18)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={x} cy={y} r={4} fill="#30D158" opacity={0.9} />
            {labelEvery3.has(i) && (
              <text x={x} y={y - 12} textAnchor="middle" fill="#30D158" style={LABEL_STYLE}>
                R
              </text>
            )}
          </g>
        );
      })}

      {/* S peaks */}
      {beats.s_peaks.map((t, i) => {
        if (!inView(t)) return null;
        const x = toX(t);
        const y = toY(getValueAt(t));
        return (
          <g key={`s-${i}`}>
            <circle cx={x} cy={y} r={2.5} fill="none" stroke="#FF9F0A" strokeWidth={1.5} opacity={0.75} />
            {i === qrsBeat && (
              <text x={x + 8} y={y + 16} textAnchor="middle" fill="#FF9F0A" style={LABEL_STYLE}>
                S
              </text>
            )}
          </g>
        );
      })}

      {/* T peaks */}
      {beats.t_peaks.map((t, i) => {
        if (!inView(t)) return null;
        const x = toX(t);
        const y = toY(getValueAt(t));
        return (
          <g key={`t-${i}`}>
            <circle cx={x} cy={y} r={3} fill="none" stroke="#BF5AF2" strokeWidth={1.5} opacity={0.85} />
            {labelEvery3.has(i) && (
              <text x={x} y={y - 10} textAnchor="middle" fill="#BF5AF2" style={LABEL_STYLE}>
                T
              </text>
            )}
          </g>
        );
      })}

      {/* PR bracket on first valid visible beat */}
      {prBeat >= 0 &&
        (() => {
          const x1 = toX(beats.p_onsets[prBeat]);
          const x2 = toX(beats.q_peaks[prBeat]);
          const y = rect.height - 32;
          return (
            <g key="pr-bracket">
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#32D2FF" strokeWidth={1.2} opacity={0.8} />
              <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="#32D2FF" strokeWidth={1.2} opacity={0.8} />
              <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke="#32D2FF" strokeWidth={1.2} opacity={0.8} />
              <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" fill="#32D2FF" style={SMALL_LABEL}>
                PR
              </text>
            </g>
          );
        })()}

      {/* QRS bracket on first valid visible beat */}
      {qrsBeat >= 0 &&
        (() => {
          const x1 = toX(beats.q_peaks[qrsBeat]);
          const x2 = toX(beats.s_peaks[qrsBeat]);
          const y = rect.height - 18;
          return (
            <g key="qrs-bracket">
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#FF9F0A" strokeWidth={1.2} opacity={0.8} />
              <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="#FF9F0A" strokeWidth={1.2} opacity={0.8} />
              <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke="#FF9F0A" strokeWidth={1.2} opacity={0.8} />
              <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" fill="#FF9F0A" style={SMALL_LABEL}>
                QRS
              </text>
            </g>
          );
        })()}

      {/* QT bracket on first valid visible beat */}
      {qtBeat >= 0 &&
        (() => {
          const x1 = toX(beats.q_peaks[qtBeat]);
          const x2 = toX(beats.t_offsets[qtBeat]);
          const y = rect.height - 4;
          return (
            <g key="qt-bracket">
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#BF5AF2" strokeWidth={1.2} opacity={0.8} />
              <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="#BF5AF2" strokeWidth={1.2} opacity={0.8} />
              <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke="#BF5AF2" strokeWidth={1.2} opacity={0.8} />
              <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" fill="#BF5AF2" style={SMALL_LABEL}>
                QT
              </text>
            </g>
          );
        })()}
    </svg>
  );
}

export function ECGWaveformPanel() {
  const signal = useECGStore((s) => s.uploadState.signal);
  const selectedLead = useECGStore((s) => s.selectedLead);
  const result = useECGStore((s) => s.analysisState.result);

  const lead = useMemo(() => {
    if (!signal) return null;
    return signal.leads.find((l) => l.name === selectedLead) || signal.leads[0] || null;
  }, [signal, selectedLead]);

  const samplingRate = signal?.samplingRate ?? 360;
  const duration = signal?.duration ?? 0;
  const features = result?.features;
  const rawDelin = features?.rawDelineation ?? EMPTY_DELINEATION;
  const diagnoses = result?.diagnoses ?? [];

  const points = useMemo(
    () => downsampleForChart(lead?.signal ?? [], samplingRate),
    [lead, samplingRate]
  );
  const beats = useMemo(
    () => buildBeatAnnotations(rawDelin, samplingRate),
    [rawDelin, samplingRate]
  );
  const problemZones = useMemo(
    () => (features ? getProblemZones(diagnoses, beats, features, samplingRate) : []),
    [diagnoses, beats, features, samplingRate]
  );

  const yDomain = useMemo<[number, number]>(() => {
    if (points.length === 0) return [-1.5, 1.5];
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
    const pad = (max - min) * 0.2 || 0.3;
    return [min - pad, max + pad];
  }, [points]);

  const [xWindow, setXWindow] = useState<[number, number]>([0, Math.min(10, duration || 10)]);

  useEffect(() => {
    setXWindow([0, Math.min(10, duration || 10)]);
  }, [signal?.id, duration]);

  // Measure the actual Recharts plot rect from the rendered SVG
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [plotRect, setPlotRect] = useState<PlotRect>({
    width: 700,
    height: 240,
    left: 50,
    top: 10,
  });

  useLayoutEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;

    const measure = () => {
      const wrapRect = wrap.getBoundingClientRect();
      // Recharts renders the actual plot area as the inner <svg>'s clipPath or
      // we can infer from the chart margins we set. Margins: top:10 right:10 bottom:30 left:50.
      // Bottom is enlarged to leave room for the tick labels we keep.
      const left = 50;
      const top = 10;
      const right = 10;
      const bottom = 30;
      setPlotRect({
        width: Math.max(50, wrapRect.width - left - right),
        height: Math.max(50, CHART_HEIGHT - top - bottom),
        left,
        top,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const zoomIn = () =>
    setXWindow(([start, end]) => {
      const center = (start + end) / 2;
      const newHalf = Math.max((end - start) / 4, 0.5);
      return [Math.max(0, center - newHalf), Math.min(duration || end, center + newHalf)];
    });
  const zoomOut = () =>
    setXWindow(([start, end]) => {
      const center = (start + end) / 2;
      const newHalf = Math.min((end - start), Math.max(duration / 2, 5));
      return [Math.max(0, center - newHalf), Math.min(duration || end, center + newHalf)];
    });
  const resetZoom = () => setXWindow([0, Math.min(10, duration || 10)]);

  if (!signal || !lead) {
    return (
      <GlassCard className="w-full">
        <p className="text-sm text-text-muted">No ECG signal loaded.</p>
      </GlassCard>
    );
  }

  const intervalCards: Array<{
    label: string;
    value: string;
    normal: boolean;
    color: string;
  }> = [
    {
      label: "PR Interval",
      value: features?.prInterval != null ? `${features.prInterval.toFixed(0)} ms` : "N/A",
      normal:
        features?.prInterval == null
          ? true
          : features.prInterval >= 120 && features.prInterval <= 200,
      color: "#32D2FF",
    },
    {
      label: "QRS Duration",
      value: features?.qrsDuration != null ? `${features.qrsDuration.toFixed(0)} ms` : "N/A",
      normal: features?.qrsDuration == null ? true : features.qrsDuration < 120,
      color: "#FF9F0A",
    },
    {
      label: "QT Interval",
      value: features?.qtInterval != null ? `${features.qtInterval.toFixed(0)} ms` : "N/A",
      normal: true,
      color: "#BF5AF2",
    },
    {
      label: "QTc Bazett",
      value: features?.qtcInterval != null ? `${features.qtcInterval.toFixed(0)} ms` : "N/A",
      normal: features?.qtcInterval == null ? true : features.qtcInterval < 450,
      color: "#BF5AF2",
    },
  ];

  return (
    <GlassCard className="w-full">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">ECG Waveform — {lead.name}</h2>
          <span className="text-xs text-text-muted font-mono">
            {samplingRate} Hz · {duration.toFixed(1)} s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomIn}
            className="text-xs px-2 py-1 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-1"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3 h-3" /> In
          </button>
          <button
            onClick={zoomOut}
            className="text-xs px-2 py-1 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-1"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3 h-3" /> Out
          </button>
          <button
            onClick={resetZoom}
            className="text-xs px-2 py-1 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-1"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <LeadSelector />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 mb-2 flex-wrap">
        {[
          { color: "#32D2FF", label: "P wave" },
          { color: "#30D158", label: "R peak" },
          { color: "#FF9F0A", label: "Q/S waves" },
          { color: "#BF5AF2", label: "T wave" },
          { color: "#FF453A", label: "Problem zone" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              style={{ background: item.color, opacity: 0.85 }}
              className="w-2.5 h-2.5 rounded-full inline-block"
            />
            <span className="text-[11px] text-text-muted font-mono">{item.label}</span>
          </div>
        ))}
      </div>

      <div ref={wrapperRef} style={{ position: "relative", height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={points} margin={{ top: 10, right: 10, bottom: 30, left: 50 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={xWindow}
              tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--text-muted))",
                fontFamily: "JetBrains Mono, monospace",
              }}
              tickLine={false}
              axisLine={false}
              tickCount={11}
              allowDataOverflow
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v) => Number(v).toFixed(2)}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--text-muted))",
                fontFamily: "JetBrains Mono, monospace",
              }}
              tickLine={false}
              axisLine={false}
              width={46}
              label={{
                value: "mV",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(var(--text-muted))",
                fontSize: 10,
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border) / 0.5)" strokeDasharray="4 4" />
            <Tooltip
              content={(props) => {
                const { active, payload, label } = props as unknown as {
                  active?: boolean;
                  payload?: ReadonlyArray<{ value: number }>;
                  label?: number | string;
                };
                if (!active || !payload?.length) return null;
                const timeSec = Number(label);
                const amp = payload[0].value;
                const candidates: Array<{ t: number; label: string; color: string }> = [];
                for (const t of beats.p_peaks) if (Number.isFinite(t)) candidates.push({ t, label: "P wave", color: "#32D2FF" });
                for (const t of beats.q_peaks) if (Number.isFinite(t)) candidates.push({ t, label: "Q wave", color: "#FF9F0A" });
                for (const t of beats.r_peaks) if (Number.isFinite(t)) candidates.push({ t, label: "R peak", color: "#30D158" });
                for (const t of beats.s_peaks) if (Number.isFinite(t)) candidates.push({ t, label: "S wave", color: "#FF9F0A" });
                for (const t of beats.t_peaks) if (Number.isFinite(t)) candidates.push({ t, label: "T wave", color: "#BF5AF2" });
                let nearest: { t: number; label: string; color: string } | null = null;
                let bestDt = 0.04;
                for (const c of candidates) {
                  const dt = Math.abs(c.t - timeSec);
                  if (dt < bestDt) { bestDt = dt; nearest = c; }
                }
                return (
                  <div style={{ background: "rgba(5,5,15,0.96)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "8px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", minWidth: "140px" }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>{(timeSec * 1000).toFixed(0)} ms</p>
                    <p style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: "4px" }}>{amp.toFixed(4)} mV</p>
                    {nearest && (
                      <p style={{ color: nearest.color, fontWeight: 700, fontSize: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "4px", marginTop: "4px" }}>
                        ← {nearest.label}
                      </p>
                    )}
                  </div>
                );
              }}
              isAnimationActive={false}
            />
            <Line
              dataKey="value"
              stroke="hsl(var(--accent-primary))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              type="linear"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        <CustomECGOverlay
          beats={beats}
          problemZones={problemZones}
          rect={plotRect}
          xDomain={xWindow}
          yDomain={yDomain}
          chartData={points}
        />
      </div>

      {/* Interval measurement cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {intervalCards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 border"
            style={{
              background: "hsl(var(--bg-elevated) / 0.4)",
              borderColor: item.normal ? "hsl(var(--border))" : "hsl(var(--accent-danger) / 0.5)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono mb-1">
              {item.label}
            </p>
            <p
              className="text-base font-mono font-semibold"
              style={{ color: item.normal ? item.color : "hsl(var(--accent-danger))" }}
            >
              {item.value}
            </p>
            {!item.normal && (
              <p className="text-[9px] text-med-danger mt-0.5">Above threshold</p>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
