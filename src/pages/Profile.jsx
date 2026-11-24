import { Link } from 'react-router-dom';
import { Compass, Heart, LogOut, MapPinned, Route, UserRound, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useTrips } from '../context/TripsContext';
import { isLiveApi } from '../lib/api';
import { initials, inr } from '../utils/format';
import '../styles/pages-main.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const { trips, wishlist } = useTrips();
  const totalSpend = trips.reduce((sum, t) => sum + (t.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0), 0);

  if (!user) {
    return (
      <div className="container page">
        <EmptyState
          as="h1"
          icon={UserRound}
          title="Sign in to see your profile"
          description="Your saved trips and wishlist stay available locally in demo mode, but a profile needs an account."
          action={<Button as={Link} to="/auth" icon={UserRound}>Login or register</Button>}
        />
      </div>
    );
  }

  const quickLinks = [
    { to: '/my-trips', label: 'My trips', count: `${trips.length}`, icon: Route },
    { to: '/wishlist', label: 'Wishlist', count: `${wishlist.length}`, icon: Heart },
    { to: '/create-trip', label: 'Plan a new trip', count: '', icon: Compass },
    { to: '/map', label: 'Travel map', count: '', icon: MapPinned },
  ];

  return (
    <div className="container page">
      <div className="stack" style={{ gap: 'var(--s2)', marginBottom: 'var(--s6)' }}>
        <span className="eyebrow">Your space</span>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">A quiet overview of what you have planned and saved.</p>
      </div>

      <div className="profile-grid">
        <Card className="stack">
          <div className="row" style={{ gap: 'var(--s4)' }}>
            <span className="profile-avatar" aria-hidden="true">{initials(user.name)}</span>
            <div className="stack" style={{ gap: 'var(--s1)' }}>
              <h2 style={{ fontSize: 'var(--t5)' }}>{user.name || 'Traveller'}</h2>
              <span className="muted">{user.email}</span>
              <Badge tone={isLiveApi() ? 'emerald' : 'warning'}>{isLiveApi() ? 'Account connected' : 'Demo account'}</Badge>
            </div>
          </div>
          <hr className="divider" />
          <dl className="profile-info">
            <div><dt>Display name</dt><dd>{user.name || '—'}</dd></div>
            <div><dt>Email</dt><dd>{user.email || '—'}</dd></div>
            <div><dt>Trips saved</dt><dd>{trips.length}</dd></div>
            <div><dt>Expenses logged</dt><dd>{trips.reduce((n, t) => n + (t.expenses?.length || 0), 0)}</dd></div>
            <div><dt>Total logged spend (INR)</dt><dd>{inr(totalSpend)}</dd></div>
          </dl>
          {!isLiveApi() ? <p className="dim" style={{ fontSize: 'var(--t1)' }}>Demo mode: account data is stored in this browser only. No server-side account is created.</p> : null}
          <Button variant="danger" icon={LogOut} onClick={logout}>Log out</Button>
        </Card>

        <Card className="stack">
          <div className="stack" style={{ gap: 'var(--s1)' }}>
            <h3 style={{ fontSize: 'var(--t4)' }}>Go to</h3>
            <p className="muted">Everything you have been working on lives in these sections.</p>
          </div>
          <nav className="quick-links" aria-label="Profile shortcuts">
            {quickLinks.map((q) => {
              const Icon = q.icon;
              return (
                <Link key={q.to} to={q.to} className="quick-link">
                  <span><Icon size={18} aria-hidden="true" /> {q.label}</span>
                  <span className="muted">{q.count} <span aria-hidden="true">→</span></span>
                </Link>
              );
            })}
          </nav>
          <div className="row" style={{ gap: 'var(--s3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)' }}>
            <Wallet size={18} aria-hidden="true" className="accent" />
            <p className="muted" style={{ fontSize: 'var(--t2)' }}>Budgets are estimates in INR. Log actual expenses on each trip to see the difference.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
