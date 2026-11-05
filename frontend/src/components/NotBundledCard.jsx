import { Link } from 'react-router-dom';
import Card from './Card.jsx';

export default function NotBundledCard() {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: 500 }}>
          This record is not bundled in the hosted demo. Available records: 100, 101, 103, 105, 117, 200.
        </p>
        <Link to="/records" className="btn btn-primary">
          Back to Record Explorer
        </Link>
      </div>
    </Card>
  );
}
