/**
 * Pre-loaded knowledge base for the Neuromuscular AI assistant.
 * Pure keyword matching — no LLM calls. Each entry lists the keywords that
 * should trigger it (lowercased) and a short clinical-style answer.
 */

export interface NeuroResponse {
  topic: string;
  keywords: string[];
  answer: string;
}

export const NEURO_RESPONSES: NeuroResponse[] = [
  {
    topic: "Myasthenia Gravis",
    keywords: ["myasthenia", "mg", "fatigable", "ach receptor", "achr"],
    answer:
      "Myasthenia Gravis is an autoimmune disorder of the neuromuscular junction caused by antibodies against the postsynaptic acetylcholine receptor. Hallmarks: fatigable weakness worsening with activity, ptosis, diplopia, bulbar symptoms. Workup: anti-AChR / anti-MuSK antibodies, repetitive nerve stimulation (decremental response), single-fibre EMG (increased jitter). First-line treatment: pyridostigmine, immunosuppression, thymectomy in selected cases.",
  },
  {
    topic: "Lambert-Eaton Myasthenic Syndrome",
    keywords: ["lambert", "eaton", "lems", "calcium channel", "vgcc"],
    answer:
      "Lambert-Eaton Myasthenic Syndrome (LEMS) is a presynaptic neuromuscular junction disorder caused by antibodies against voltage-gated calcium channels (P/Q-type). Strength briefly improves with sustained contraction (post-exercise facilitation). ~50% of cases are paraneoplastic (small-cell lung cancer). EMG shows incremental response on high-frequency stimulation. Treatment: 3,4-diaminopyridine, IVIG, treat underlying malignancy.",
  },
  {
    topic: "Duchenne / Becker Muscular Dystrophy",
    keywords: ["duchenne", "becker", "dystrophin", "dmd", "muscular dystrophy"],
    answer:
      "Duchenne (DMD) and Becker muscular dystrophies are X-linked recessive disorders caused by mutations in the dystrophin gene. DMD presents in early childhood with proximal weakness, calf pseudohypertrophy, Gowers sign, and elevated CK (often >10,000). Loss of ambulation typically by age 12 in DMD. Cardiomyopathy and respiratory failure are major complications. Treatment: corticosteroids, exon-skipping therapies, cardiopulmonary surveillance.",
  },
  {
    topic: "Amyotrophic Lateral Sclerosis (ALS)",
    keywords: ["als", "amyotrophic", "motor neuron", "mnd", "lou gehrig"],
    answer:
      "ALS is a progressive degeneration of upper and lower motor neurons. Mixed UMN (spasticity, hyperreflexia) and LMN (atrophy, fasciculations) signs without sensory loss. Diagnosis is clinical (Awaji/El Escorial criteria) supported by EMG showing widespread denervation. Mean survival 3–5 years; respiratory failure is the usual cause of death. Disease-modifying therapy: riluzole, edaravone; symptomatic care via multidisciplinary clinic.",
  },
  {
    topic: "Guillain-Barré Syndrome",
    keywords: ["guillain", "barre", "gbs", "aidp", "ascending paralysis"],
    answer:
      "Guillain-Barré Syndrome is an acute inflammatory demyelinating polyradiculoneuropathy, often post-infectious (Campylobacter jejuni, CMV, Zika). Presents with rapidly progressive ascending weakness, areflexia, and albuminocytologic dissociation in CSF (high protein, normal cell count). Up to 30% need ventilatory support. Treatment: IVIG or plasma exchange — steroids are NOT effective.",
  },
  {
    topic: "Chronic Inflammatory Demyelinating Polyneuropathy",
    keywords: ["cidp", "chronic demyelinating", "chronic inflammatory"],
    answer:
      "CIDP is the chronic counterpart of GBS — symmetric proximal and distal weakness with sensory loss progressing over >8 weeks. Nerve conduction studies show demyelination (prolonged distal latencies, conduction block). Unlike GBS, CIDP responds to corticosteroids in addition to IVIG and plasma exchange.",
  },
  {
    topic: "Charcot-Marie-Tooth Disease",
    keywords: ["charcot", "cmt", "hereditary neuropathy", "pmp22"],
    answer:
      "Charcot-Marie-Tooth (CMT) is the most common inherited neuropathy. CMT1A (PMP22 duplication) is the most frequent subtype — slowly progressive distal weakness, pes cavus, hammertoes, and stocking-distribution sensory loss starting in adolescence. NCS distinguishes demyelinating (CMT1) from axonal (CMT2) forms. Treatment is supportive: orthotics, physiotherapy, avoid neurotoxic drugs (vincristine).",
  },
  {
    topic: "Polymyositis / Dermatomyositis",
    keywords: ["polymyositis", "dermatomyositis", "myositis", "gottron", "heliotrope"],
    answer:
      "Idiopathic inflammatory myopathies present with subacute symmetric proximal weakness and elevated CK. Dermatomyositis adds characteristic skin findings (heliotrope rash, Gottron papules) and carries paraneoplastic risk. EMG shows myopathic units with fibrillations; muscle biopsy confirms. Treatment: high-dose corticosteroids plus steroid-sparing agent (methotrexate, azathioprine, IVIG).",
  },
  {
    topic: "Spinal Muscular Atrophy",
    keywords: ["sma", "spinal muscular atrophy", "smn1"],
    answer:
      "Spinal Muscular Atrophy is an autosomal recessive degeneration of anterior horn cells caused by SMN1 deletion/mutation. Severity correlates inversely with SMN2 copy number. Disease-modifying therapies (nusinersen, onasemnogene abeparvovec, risdiplam) have transformed prognosis when started early — newborn screening is now widespread.",
  },
  {
    topic: "Myotonic Dystrophy",
    keywords: ["myotonic", "dm1", "dm2", "myotonia", "dmpk"],
    answer:
      "Myotonic Dystrophy type 1 (Steinert) is an autosomal-dominant CTG repeat expansion in DMPK. Multisystem: distal weakness, myotonia (delayed muscle relaxation), cataracts, frontal balding, cardiac conduction defects, insulin resistance. Cardiac monitoring is essential — sudden death from heart block is a major risk. Symptomatic treatment for myotonia: mexiletine.",
  },
  {
    topic: "Bell's Palsy",
    keywords: ["bell", "facial palsy", "facial nerve"],
    answer:
      "Bell's palsy is acute idiopathic peripheral facial nerve (CN VII) paralysis, often preceded by viral prodrome. Unlike a central lesion, it affects the entire ipsilateral hemiface including the forehead. Treatment within 72 hours with prednisolone improves outcomes; antivirals add little benefit. ~70% recover fully without treatment.",
  },
  {
    topic: "Carpal Tunnel Syndrome",
    keywords: ["carpal tunnel", "median nerve", "cts", "tinel", "phalen"],
    answer:
      "Carpal tunnel syndrome is median nerve entrapment at the wrist. Nocturnal paraesthesia in the thumb, index, middle, and radial half of the ring finger; thenar wasting in advanced cases. Tinel and Phalen signs support the diagnosis; nerve conduction studies confirm. Conservative care (splinting, steroid injection) first; surgical release for refractory or severe cases.",
  },
  {
    topic: "Diabetic Neuropathy",
    keywords: ["diabetic neuropathy", "diabetes", "stocking glove", "polyneuropathy"],
    answer:
      "Distal symmetric polyneuropathy is the commonest complication of diabetes — length-dependent stocking-glove sensory loss, painful paraesthesia, loss of ankle reflexes. Tight glycaemic control slows progression. Symptomatic options for neuropathic pain: duloxetine, pregabalin, gabapentin, amitriptyline.",
  },
  {
    topic: "Multiple Sclerosis (Neuromuscular features)",
    keywords: ["multiple sclerosis", "ms", "demyelinating"],
    answer:
      "Multiple Sclerosis is a CNS demyelinating disorder; while not strictly a neuromuscular junction disease, motor symptoms are common — spasticity, fatigue, gait disturbance from corticospinal involvement. McDonald criteria require dissemination in space and time on MRI. Disease-modifying therapies (interferons, glatiramer, anti-CD20 mAbs, S1P modulators) reduce relapses.",
  },
  {
    topic: "Critical Illness Neuromyopathy",
    keywords: ["icu", "critical illness", "ciap", "cim"],
    answer:
      "Critical illness neuromyopathy develops in ICU patients after prolonged sepsis, mechanical ventilation, or steroid + neuromuscular blocker exposure. Presents as failure to wean from the ventilator with diffuse flaccid weakness. Prevention: minimise sedation, early mobilisation, aggressive glycaemic control. Recovery is variable.",
  },
];

export const NEURO_DEFAULT_REPLY =
  "I don't have a pre-loaded answer for that. Try keywords like 'myasthenia', 'ALS', 'GBS', 'Duchenne', 'CIDP', 'CMT', 'myositis', 'SMA', 'myotonic', 'Bell', 'carpal tunnel', or 'diabetic neuropathy'.";

export function findNeuroResponse(query: string): NeuroResponse | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  let best: { entry: NeuroResponse; score: number } | null = null;
  for (const entry of NEURO_RESPONSES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.length; // longer match = stronger
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  return best?.entry ?? null;
}
