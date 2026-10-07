export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'No records found matching criteria.',
  onRowClick = null,
}) {
  if (loading) {
    return (
      <div className="table-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-ecg" style={{ margin: '0 auto 0.75rem' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading dataset table…</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row[keyField] ?? rowIdx}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
