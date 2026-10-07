/**
 * Canonical ANSI/AAMI EC57 Bidirectional RR Timing Feature Definitions.
 *
 * Exactly 9 bidirectional timing features in canonical order as defined
 * in Phase 8 and frozen across the scientific inference pipeline.
 */

export const CANONICAL_RR_FEATURES = [
  {
    key: 'RR_prev',
    name: 'RR_prev',
    label: 'Preceding RR Interval',
    unit: 's',
    description: 'Temporal interval between current R-peak and immediately preceding R-peak.',
  },
  {
    key: 'HR_prev',
    name: 'HR_prev',
    label: 'Preceding Heart Rate',
    unit: 'bpm',
    description: 'Instantaneous heart rate derived from preceding RR interval (60 / RR_prev).',
  },
  {
    key: 'RR_local_median',
    name: 'RR_local_median',
    label: 'Local Median RR',
    unit: 's',
    description: 'Running median RR interval across surrounding 10-beat context window.',
  },
  {
    key: 'RR_ratio_prev',
    name: 'RR_ratio_prev',
    label: 'Preceding RR Ratio',
    unit: 'ratio',
    description: 'Ratio of preceding RR interval to local median RR (RR_prev / RR_local_median).',
  },
  {
    key: 'RR_dev_prev',
    name: 'RR_dev_prev',
    label: 'Preceding RR Deviation',
    unit: 's',
    description: 'Difference between preceding RR interval and local median (RR_prev - RR_local_median).',
  },
  {
    key: 'RR_next',
    name: 'RR_next',
    label: 'Subsequent RR Interval',
    unit: 's',
    description: 'Temporal interval between current R-peak and immediately subsequent R-peak.',
  },
  {
    key: 'HR_next',
    name: 'HR_next',
    label: 'Subsequent Heart Rate',
    unit: 'bpm',
    description: 'Instantaneous heart rate derived from subsequent RR interval (60 / RR_next).',
  },
  {
    key: 'RR_ratio_bidi',
    name: 'RR_ratio_bidi',
    label: 'Bidirectional RR Ratio',
    unit: 'ratio',
    description: 'Ratio of preceding RR interval to subsequent RR interval (RR_prev / RR_next).',
  },
  {
    key: 'RR_bidi_diff',
    name: 'RR_bidi_diff',
    label: 'Bidirectional RR Difference',
    unit: 's',
    description: 'Signed difference between preceding and subsequent RR intervals (RR_prev - RR_next).',
  },
];
