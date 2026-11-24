import { Link } from 'react-router-dom';
import { Heart, Compass } from 'lucide-react';
import { Button, EmptyState, Skeleton, Card } from '../components/ui';
import DestinationCard from '../components/DestinationCard';
import { getDestination } from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import '../styles/pages-main.css';

export default function Wishlist() {
  const { wishlist, loading } = useTrips();
  const saved = wishlist.map(getDestination).filter(Boolean);

  return (
    <div className="container page">
      <div className="section-head">
        <div className="stack" style={{ gap: 'var(--s2)' }}>
          <span className="eyebrow">Saved for later</span>
          <h1 className="page-title">Wishlist</h1>
          <p className="page-sub">Places you want to remember. Save a destination anywhere you see a heart.</p>
        </div>
        <Button as={Link} to="/explore" variant="secondary" icon={Compass}>Explore destinations</Button>
      </div>

      {loading ? (
        <div className="grid grid--3">{Array.from({ length: 3 }, (_, i) => <Card key={i} className="stack"><Skeleton height={220} /><Skeleton width="60%" height={22} /></Card>)}</div>
      ) : saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any destination to keep it here for later."
          action={<Button as={Link} to="/explore" icon={Compass}>Find destinations</Button>}
        />
      ) : (
        <>
          <p className="muted wishlist__count" aria-live="polite">{saved.length} {saved.length === 1 ? 'destination' : 'destinations'} saved</p>
          <div className="grid grid--3">{saved.map((d) => <DestinationCard key={d.id} destination={d} compact />)}</div>
        </>
      )}
    </div>
  );
}
