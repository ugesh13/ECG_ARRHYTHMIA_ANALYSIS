export default function PageContainer({
  title,
  subtitle,
  actions = null,
  breadcrumbs = null,
  children,
}) {
  return (
    <div className="page-container">
      {(title || breadcrumbs) && (
        <header className="page-header">
          {breadcrumbs && (
            <nav
              aria-label="Breadcrumb"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {breadcrumbs}
            </nav>
          )}
          <div className="page-header-top">
            <div>
              {title && <h1 className="page-title">{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}
