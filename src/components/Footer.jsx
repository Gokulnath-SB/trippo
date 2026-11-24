import { Link } from 'react-router-dom';
import { Compass, Heart, Mail, MapPin } from 'lucide-react';
import '../styles/shell.css';

const groups = [
  {
    title: 'Explore',
    links: [
      { to: '/explore', label: 'Destinations' },
      { to: '/create-trip', label: 'Plan a trip' },
      { to: '/map', label: 'Travel map' },
      { to: '/assistant', label: 'AI assistant (demo)' },
    ],
  },
  {
    title: 'Your space',
    links: [
      { to: '/my-trips', label: 'My trips' },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/profile', label: 'Profile' },
      { to: '/auth', label: 'Login / Register' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container container--wide">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="brand" aria-label="tripo.tech home">
              <span className="brand__mark" aria-hidden="true"><Compass size={18} strokeWidth={2.2} /></span>
              <span className="brand__word">tripo<span className="brand__accent">.tech</span></span>
            </Link>
            <p className="muted">Explore Beyond. Travel Smarter.</p>
            <p className="site-footer__note">An independent travel-planning demo. Curated destination facts and indicative budgets — no live booking, pricing or availability data.</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} className="site-footer__group" aria-label={g.title}>
              <h3>{g.title}</h3>
              {g.links.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </nav>
          ))}
          <div className="site-footer__group">
            <h3>Contact</h3>
            <p className="site-footer__contact"><Mail size={16} aria-hidden="true" /> hello@tripo.tech</p>
            <p className="site-footer__contact"><MapPin size={16} aria-hidden="true" /> Built for journeys everywhere</p>
            <p className="site-footer__contact"><Heart size={16} aria-hidden="true" /> Made for thoughtful travel</p>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} tripo.tech</span>
          <span>Map data © OpenStreetMap contributors · Weather by Open-Meteo</span>
        </div>
      </div>
    </footer>
  );
}
