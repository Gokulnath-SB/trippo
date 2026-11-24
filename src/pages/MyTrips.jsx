import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPinned, Plus, Route, Trash2, Users, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, Modal, Skeleton, Badge } from '../components/ui';
import { useTrips } from '../context/TripsContext';
import { dateRange, inr } from '../utils/format';
import '../styles/pages-main.css';

export default function MyTrips() {
  const { trips, deleteTrip, loading } = useTrips();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true); setError('');
    try { await deleteTrip(pendingDelete.id); setPendingDelete(null); }
    catch (e) { setError(e.message || 'Could not delete this trip.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container page">
      <div className="section-head">
        <div className="stack" style={{ gap: 'var(--s2)' }}>
          <span className="eyebrow">Your collection</span>
          <h1 className="page-title">My Trips</h1>
          <p className="page-sub">Every plan you have saved, in one place. Open one to keep shaping the days or track its spend.</p>
        </div>
        <Button as={Link} to="/create-trip" icon={Plus}>New trip</Button>
      </div>

      {error ? <p className="inline-alert" role="alert">{error}</p> : null}

      {loading ? (
        <div className="grid grid--3" aria-label="Loading trips">
          {[0, 1, 2].map((i) => <Card key={i} className="stack"><Skeleton height={180} /><Skeleton width="60%" height={24} /><Skeleton width="80%" /></Card>)}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No trips saved yet"
          description="Start with a destination and a few dates. Your plan will appear here once you save it."
          action={<Button as={Link} to="/create-trip" icon={Plus}>Plan your first trip</Button>}
        />
      ) : (
        <div className="grid grid--3">
          {trips.map((t) => (
            <Card key={t.id} className="trip-card stack">
              <div className="row row--between">
                <Badge tone="emerald">{t.tripType || 'Trip'}</Badge>
                <span className="dim" style={{ fontSize: 'var(--t1)' }}>{t.itinerary?.reduce((n, d) => n + (d.activities?.length || 0), 0) || 0} activities</span>
              </div>
              <div className="stack" style={{ gap: 'var(--s1)' }}>
                <h3>{t.name || t.destinationName || 'Untitled trip'}</h3>
                <p className="muted row" style={{ gap: 'var(--s2)' }}><MapPinned size={15} aria-hidden="true" /> {t.destinationName || t.destination}</p>
              </div>
              <dl className="trip-card__meta">
                <div><dt><CalendarDays size={14} aria-hidden="true" /> Dates</dt><dd>{dateRange(t.startDate, t.endDate)}</dd></div>
                <div><dt><Users size={14} aria-hidden="true" /> Travellers</dt><dd>{t.travellers || 1}</dd></div>
                <div><dt><Wallet size={14} aria-hidden="true" /> Budget</dt><dd>{inr(t.budget)}</dd></div>
              </dl>
              <div className="row wrap trip-card__actions">
                <Button as={Link} to={`/itinerary/${t.id}`} size="sm">Itinerary</Button>
                <Button as={Link} to={`/budget/${t.id}`} size="sm" variant="secondary">Budget</Button>
                <Button as={Link} to={`/map/${t.id}`} size="sm" variant="ghost" icon={MapPinned}>Map</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => setPendingDelete(t)} className="trip-card__delete">Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this trip?"
        footer={<>
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy}>Delete trip</Button>
        </>}
      >
        <p className="muted">“{pendingDelete?.name || 'This trip'}” and its itinerary and expenses will be removed. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
