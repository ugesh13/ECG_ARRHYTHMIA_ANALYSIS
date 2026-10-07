import ClassBadge from './ClassBadge.jsx';

export default function ECGLegend({ compact = false }) {
  const classes = [
    { code: 'N', label: 'Normal / Bundle Branch Block' },
    { code: 'S', label: 'Supraventricular Ectopic' },
    { code: 'V', label: 'Premature Ventricular Contraction' },
    { code: 'F', label: 'Fusion of Ventricular & Normal' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: compact ? '0.5rem 1rem' : '0.75rem 1.25rem',
        padding: compact ? '0.4rem 0.75rem' : '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface-2)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.82rem',
      }}
    >
      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
        ANSI/AAMI EC57 Taxonomy:
      </span>
      {classes.map((c) => (
        <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ClassBadge cls={c.code} size="sm" />
          {!compact && <span style={{ color: 'var(--text-muted)' }}>{c.label}</span>}
        </div>
      ))}
    </div>
  );
}
