/**
 * ANSI/AAMI EC57 Arrhythmia Taxonomy & Annotation Mapping.
 *
 * Grounded in official PhysioNet / MIT-BIH standards and project label mapping.
 * Purely for academic and educational signal exploration.
 */

export const AAMI_CLASSES = {
  N: {
    code: 'N',
    name: 'Normal / Non-ectopic',
    description: 'Normal sinus rhythm, bundle branch blocks (LBBB, RBBB), and escape beats.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  S: {
    code: 'S',
    name: 'Supraventricular Ectopic',
    description: 'Atrial premature beats (APB/APC), aberrated atrial, and nodal/junctional premature beats.',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  V: {
    code: 'V',
    name: 'Ventricular Ectopic',
    description: 'Premature ventricular contractions (PVC/VPB), ventricular escape beats, and R-on-T PVCs.',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  F: {
    code: 'F',
    name: 'Fusion Beat',
    description: 'Hybrid ventricular and normal conduction depolarizing simultaneously.',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  Q: {
    code: 'Q',
    name: 'Unknown / Paced Beat',
    description: 'Paced heartbeats, unclassifiable beats, or rhythm artifacts.',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
};

export const SYMBOL_TAXONOMY = {
  // Class N: Non-ectopic
  'N': { aami: 'N', desc: 'Normal beat', isBeat: true },
  '.': { aami: 'N', desc: 'Normal beat (dot)', isBeat: true },
  'L': { aami: 'N', desc: 'Left bundle branch block beat', isBeat: true },
  'R': { aami: 'N', desc: 'Right bundle branch block beat', isBeat: true },
  'e': { aami: 'N', desc: 'Atrial escape beat', isBeat: true },
  'j': { aami: 'N', desc: 'Nodal (junctional) escape beat', isBeat: true },
  'B': { aami: 'N', desc: 'Bundle branch block beat', isBeat: true },

  // Class S: Supraventricular ectopic
  'A': { aami: 'S', desc: 'Atrial premature contraction (APC)', isBeat: true },
  'a': { aami: 'S', desc: 'Aberrated atrial premature beat', isBeat: true },
  'J': { aami: 'S', desc: 'Nodal (junctional) premature beat', isBeat: true },
  'S': { aami: 'S', desc: 'Supraventricular premature beat', isBeat: true },

  // Class V: Ventricular ectopic
  'V': { aami: 'V', desc: 'Premature ventricular contraction (PVC)', isBeat: true },
  'E': { aami: 'V', desc: 'Ventricular escape beat', isBeat: true },
  'r': { aami: 'V', desc: 'R-on-T premature ventricular contraction', isBeat: true },

  // Class F: Fusion
  'F': { aami: 'F', desc: 'Fusion of ventricular and normal beat', isBeat: true },

  // Class Q: Paced / Unknown
  '/': { aami: 'Q', desc: 'Paced beat', isBeat: true },
  'f': { aami: 'Q', desc: 'Fusion of paced and normal beat', isBeat: true },
  'Q': { aami: 'Q', desc: 'Unclassifiable beat', isBeat: true },
  '?': { aami: 'Q', desc: 'Beat not classified', isBeat: true },

  // Non-beat rhythm / event markers
  '+': { aami: null, desc: 'Rhythm change / announcement', isBeat: false },
  '~': { aami: null, desc: 'Signal quality change / artifact', isBeat: false },
  '|': { aami: null, desc: 'Isolated pacemaker pulse', isBeat: false },
  'x': { aami: null, desc: 'Non-conducted P-wave', isBeat: false },
  '"': { aami: null, desc: 'Comment annotation', isBeat: false },
};

/** Get AAMI class and details for a given raw MIT-BIH annotation symbol */
export function getAnnotationMeta(symbol) {
  const cleanSym = String(symbol || '').trim();
  const entry = SYMBOL_TAXONOMY[cleanSym];
  if (entry) {
    return {
      symbol: cleanSym,
      aamiClass: entry.aami,
      description: entry.desc,
      isBeat: entry.isBeat,
      classInfo: entry.aami ? AAMI_CLASSES[entry.aami] : null,
    };
  }
  return {
    symbol: cleanSym,
    aamiClass: 'Q',
    description: 'Unclassified annotation',
    isBeat: false,
    classInfo: AAMI_CLASSES.Q,
  };
}

// ANSI/AAMI EC57 Partition Sets
export const DS1_TRAIN = new Set(['101', '106', '109', '112', '115', '116', '119', '122', '124', '203', '205', '207', '208', '215', '223', '230']);
export const DS1_VAL = new Set(['108', '114', '118', '201', '209', '220']);
export const DS2_TEST = new Set(['100', '103', '105', '111', '113', '117', '121', '123', '200', '202', '210', '212', '213', '214', '219', '221', '222', '228', '231', '232', '233', '234']);
export const PACED = new Set(['102', '104', '107', '217']);

/** Determine partition category and styling for record */
export function getRecordPartition(recordId, source) {
  if (source === 'upload') return { name: 'Uploaded Record', badge: 'badge-default' };
  if (DS2_TEST.has(recordId)) return { name: 'DS2 Held-Out Test', badge: 'badge-purple' };
  if (DS1_VAL.has(recordId)) return { name: 'DS1 Validation', badge: 'badge-warning' };
  if (DS1_TRAIN.has(recordId)) return { name: 'DS1 Training', badge: 'badge-cyan' };
  if (PACED.has(recordId)) return { name: 'Paced (Isolated)', badge: 'badge-default' };
  return { name: 'MIT-BIH', badge: 'badge-default' };
}

