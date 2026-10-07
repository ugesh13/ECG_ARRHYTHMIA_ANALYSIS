export default function StatCard({
  label,
  value,
  subtext,
  badge,
  icon,
  accentColor,
  style = {},
}) {
  return (
    <div
      className="stat-card"
      style={{
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        ...style,
      }}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {badge}
      </div>
      <div className="stat-card-value" style={{ color: accentColor || 'var(--text-primary)' }}>
        {value}
      </div>
      {subtext && <div className="stat-card-subtext">{subtext}</div>}
      {icon && (
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            bottom: '1rem',
            opacity: 0.1,
            pointerEvents: 'none',
          }}
        >
          {icon}
        </div>
      )}
    </div>
  );
}
