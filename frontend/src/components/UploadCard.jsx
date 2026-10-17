import { useRef, useState } from 'react';

const ALLOWED = ['.hea', '.dat', '.atr'];
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024; // 4.5 MB Vercel Serverless request body limit
const formatSize = (b) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);
const extOf = (n) => n.slice(n.lastIndexOf('.')).toLowerCase();

/** Client-side check only; the backend re-validates everything. */
export function validateFiles(files) {
  if (!files.length) return 'Select a .hea header and a .dat signal file (include .atr for beat classification).';
  const bad = files.find((f) => !ALLOWED.includes(extOf(f.name)));
  if (bad) return `Unsupported file: ${bad.name}. Allowed: ${ALLOWED.join(', ')}.`;
  const exts = files.map((f) => extOf(f.name));
  if (!exts.includes('.hea') || !exts.includes('.dat')) return 'Both a .hea header file and a .dat signal file are required.';

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
  if (totalSize > MAX_UPLOAD_BYTES) {
    return `Total upload size (${formatSize(totalSize)}) exceeds the Vercel serverless limit of 4.5 MB. Standard 30-minute MIT-BIH records (~1.96 MB) fit easily. For larger recordings, please test using the preloaded MIT-BIH records.`;
  }
  return null;
}

export default function UploadCard({ onUpload, progress, status, error }) {
  const [files, setFiles] = useState([]);
  const [localError, setLocalError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const choose = (list) => { setFiles(Array.from(list)); setLocalError(null); };
  const submit = () => {
    const problem = validateFiles(files);
    if (problem) return setLocalError(problem);
    onUpload(files);
  };
  const shownError = localError || error;

  const exts = files.map((f) => extOf(f.name));
  const hasAtr = exts.includes('.atr');
  const hasHeaAndDat = exts.includes('.hea') && exts.includes('.dat');

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Upload ECG Record</h2>
        <span className="badge badge-default" style={{ fontSize: '0.75rem' }}>PhysioNet WFDB Format</span>
      </div>

      <div
        style={{
          padding: '0.65rem 0.9rem',
          borderRadius: 'var(--radius-sm, 6px)',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          marginBottom: '1rem',
        }}
      >
        <strong style={{ color: 'var(--accent-cyan, #38bdf8)' }}>ℹ️ Vercel Serverless Demo Storage & Payload Notice:</strong> Uploaded WFDB records are written to temporary serverless instance storage (<code>/tmp</code>) and subject to Vercel's <strong>4.5 MB function payload limit</strong>. Standard 30-minute MIT-BIH recordings (~1.96 MB total) fit easily. Because serverless instances are stateless, uploads do not persist permanently across restarts. For reliable viva evaluation, preloaded MIT-BIH recordings are permanently available.
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      >
        <p style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>Drag and drop WFDB files here, or click to browse</p>
        <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          Same record base name: <strong>.hea + .dat</strong> (waveform view) and <strong>.atr</strong> (required for beat classification)
        </p>
        <input ref={inputRef} type="file" multiple accept={ALLOWED.join(',')} hidden
          onChange={(e) => choose(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {hasHeaAndDat && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.75rem',
              fontSize: '0.82rem',
              backgroundColor: hasAtr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${hasAtr ? 'var(--color-class-N-border)' : 'var(--color-class-S-border)'}`,
              color: hasAtr ? 'var(--color-class-N)' : 'var(--color-class-S)',
            }}>
              {hasAtr ? (
                <>✓ <strong>Full Analysis Mode:</strong> .atr annotations included. Beat-level 209-D classification will be available.</>
              ) : (
                <>⚠️ <strong>Waveform-Only Mode:</strong> .atr annotation file not selected. You can view continuous waveforms, but beat-level classification requires .atr annotations.</>
              )}
            </div>
          )}

          <table className="table">
            <thead><tr><th>Filename</th><th>Type</th><th>Size</th><th>Requirement</th></tr></thead>
            <tbody>
              {files.map((f) => {
                const ext = extOf(f.name);
                const reqText = ext === '.hea' ? 'Required (Header)' : ext === '.dat' ? 'Required (Signal)' : ext === '.atr' ? 'Required for Classification' : 'Optional';
                return (
                  <tr key={f.name}>
                    <td className="font-mono">{f.name}</td>
                    <td>{ext}</td>
                    <td>{formatSize(f.size)}</td>
                    <td style={{ fontSize: '0.78rem', color: ext === '.atr' ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{reqText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status === 'uploading' && (
        <div className="progress" aria-label="Upload progress"><div style={{ width: `${progress}%` }} /></div>
      )}
      {status === 'success' && <p className="ok">Upload successful.</p>}
      {shownError && <p className="error-text" role="alert">{shownError}</p>}

      <button className="btn" onClick={submit} disabled={status === 'uploading'}>
        {status === 'uploading' ? `Uploading… ${progress}%` : 'Upload'}
      </button>
    </section>
  );
}
