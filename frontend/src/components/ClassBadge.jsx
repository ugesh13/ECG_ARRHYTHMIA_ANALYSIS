/**
 * Semantic badge for ANSI/AAMI EC57 arrhythmia classes.
 * Combines color + symbol + descriptive text label for accessibility.
 */

const CLASS_DESCRIPTIONS = {
  N: 'Normal / Non-ectopic',
  S: 'Supraventricular Ectopic',
  V: 'Ventricular Ectopic',
  F: 'Fusion Beat',
  Q: 'Unknown / Unclassified',
  unclassified_edge_beat: 'Edge Boundary Beat',
};

export default function ClassBadge({ cls, symbol = null, showDescription = false, size = 'md' }) {
  const normClass = cls === 'unclassified_edge_beat' ? 'edge' : (cls || 'edge').toUpperCase();
  const desc = CLASS_DESCRIPTIONS[cls] || CLASS_DESCRIPTIONS[normClass] || 'Unknown Beat';
  const displaySymbol = symbol ? ` [${symbol}]` : '';

  return (
    <span
      className={`badge class-badge class-badge-${normClass}`}
      title={desc}
      style={{
        fontSize: size === 'sm' ? '0.72rem' : size === 'lg' ? '0.9rem' : '0.8rem',
        padding: size === 'sm' ? '0.15rem 0.45rem' : '0.2rem 0.65rem',
      }}
    >
      <span>{cls}{displaySymbol}</span>
      {showDescription && (
        <span style={{ fontWeight: 'normal', opacity: 0.9, marginLeft: '0.25rem' }}>
          • {desc}
        </span>
      )}
    </span>
  );
}
