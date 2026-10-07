import { useRef, useState } from 'react';

const ALLOWED = ['.hea', '.dat', '.atr'];
const formatSize = (b) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);
const extOf = (n) => n.slice(n.lastIndexOf('.')).toLowerCase();

/** Client-side check only; the backend re-validates everything. */
export function validateFiles(files) {
  if (!files.length) return 'Select a .hea and a .dat file (optionally .atr).';
  const bad = files.find((f) => !ALLOWED.includes(extOf(f.name)));
  if (bad) return `Unsupported file: ${bad.name}. Allowed: ${ALLOWED.join(', ')}.`;
  const exts = files.map((f) => extOf(f.name));
  if (!exts.includes('.hea') || !exts.includes('.dat')) return 'Both a .hea and a .dat file are required.';
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

  return (
    <section className="card">
      <h2>Upload ECG record</h2>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      >
        <p>Drag and drop WFDB files here, or click to browse</p>
        <p className="muted">One record: .hea + .dat (+ optional .atr), same base name</p>
        <input ref={inputRef} type="file" multiple accept={ALLOWED.join(',')} hidden
               onChange={(e) => choose(e.target.files)} />
      </div>

      {files.length > 0 && (
        <table className="table">
          <thead><tr><th>Filename</th><th>Type</th><th>Size</th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.name}><td>{f.name}</td><td>{extOf(f.name)}</td><td>{formatSize(f.size)}</td></tr>
            ))}
          </tbody>
        </table>
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
