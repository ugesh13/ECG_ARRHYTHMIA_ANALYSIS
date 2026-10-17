import ClassBadge from './ClassBadge.jsx';

export default function ECGLegend({ compact = false }) {
  const classes = [
    { code: 'N', short: 'Normal Sinus', label: 'Normal Sinus / Bundle Branch Block' },
    { code: 'S', short: 'Supraventricular', label: 'Supraventricular Ectopic (Atrial/Nodal Premature)' },
    { code: 'V', short: 'Ventricular', label: 'Ventricular Ectopic (PVC / Ventricular Escape)' },
    { code: 'F', short: 'Fusion Beat', label: 'Fusion of Ventricular and Normal Depolarization' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: compact ? '0.5rem 0.85rem' : '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface-2)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.82rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: compact ? '0.6rem 1rem' : '0.75rem 1.25rem',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
          AAMI EC57 Beat Classes:
        </span>
        {classes.map((c) => (
          <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClassBadge cls={c.code} size="sm" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {compact ? c.short : c.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Note: These represent <em>beat-level morphological categories</em>, not holistic patient rhythm diagnoses or real-time clinical monitoring.
      </div>
    </div>
  );
}
