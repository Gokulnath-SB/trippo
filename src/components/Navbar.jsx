import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Compass, Menu, Plus, UserRound, X } from 'lucide-react';
import { Button, IconButton } from './ui';
import { useAuth } from '../lib/auth';
import '../styles/shell.css';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/create-trip', label: 'Plan a Trip' },
  { to: '/my-trips', label: 'My Trips' },
  { to: '/assistant', label: 'AI Assistant' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-nav">
      <div className="container container--wide site-nav__inner">
        <Link to="/" className="brand" aria-label="tripo.tech home">
          <span className="brand__mark" aria-hidden="true"><Compass size={18} strokeWidth={2.2} /></span>
          <span className="brand__word">tripo<span className="brand__accent">.tech</span></span>
        </Link>

        <nav className="site-nav__links" aria-label="Primary navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-nav__actions">
          {user ? (
            <Button as={Link} to="/profile" variant="ghost" size="sm" icon={UserRound}>
              <span className="site-nav__user" title={user.name || 'Profile'}>{user.name?.split(' ')[0] || 'Profile'}</span>
            </Button>
          ) : (
            <Button as={Link} to="/auth" variant="ghost" size="sm">Login</Button>
          )}
          <Button as={Link} to="/create-trip" size="sm" icon={Plus}>Plan a trip</Button>
        </div>

        <IconButton
          className="site-nav__toggle"
          label={open ? 'Close navigation' : 'Open navigation'}
          icon={open ? X : Menu}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {open ? (
        <nav id="mobile-nav" className="site-nav__drawer" aria-label="Mobile navigation">
          <div className="container stack" style={{ gap: 'var(--s1)' }}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `site-nav__drawer-link${isActive ? ' is-active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
            <div className="site-nav__drawer-foot">
              {user ? (
                <Button as={Link} to="/profile" variant="secondary" icon={UserRound}>Profile</Button>
              ) : (
                <Button as={Link} to="/auth" variant="secondary">Login</Button>
              )}
              <Button as={Link} to="/map" variant="ghost" icon={Compass}>Travel map</Button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
