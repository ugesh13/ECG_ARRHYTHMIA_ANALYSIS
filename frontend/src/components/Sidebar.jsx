import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/upload', label: 'Upload ECG' },
  { to: '/analysis', label: 'ECG Analysis' },
  { to: '/history', label: 'History' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
