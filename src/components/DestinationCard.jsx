import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Heart, MapPin } from 'lucide-react';
import { Badge } from './ui';
import { categoryLabel } from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import { isLiveApi } from '../lib/api';
import '../styles/shell.css';

export default function DestinationCard({ destination, compact = false, detailed = false }) {
  const { wishlist, toggleWishlist } = useTrips();
  const { user } = useAuth();
  const saved = wishlist.includes(destination.id);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (isLiveApi() && !user) {
      setSaveError('Sign in to save this place to your account.');
      return;
    }
    setSaveError('');
    try { await toggleWishlist(destination.id); }
    catch { setSaveError('Could not update your wishlist. Please try again.'); }
  };

  return (
    <article className={`dest-card${compact ? ' dest-card--compact' : ''}`}>
      <Link to={`/destinations/${destination.id}`} className="dest-card__link" aria-label={`View ${destination.name} details`}>
        <div className="media dest-card__media">
          <img src={destination.image} alt={`${destination.name}, ${destination.country}`} loading="lazy" decoding="async" />
          <Badge tone="emerald" className="dest-card__badge">{categoryLabel(destination.category)}</Badge>
        </div>
        <div className="dest-card__body">
          <div className="row row--between dest-card__title-row">
            <h3>{destination.name}</h3>
            <ArrowUpRight size={18} aria-hidden="true" className="dest-card__arrow" />
          </div>
          <p className="dest-card__location"><MapPin size={14} aria-hidden="true" /> {destination.city}, {destination.region}, {destination.country}</p>
          {detailed ? (
            <>
              <p className="dest-card__desc muted">{destination.description}</p>
              <ul className="dest-card__highlights" aria-label={`Highlights in ${destination.name}`}>
                {destination.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
              </ul>
              <span className="dest-card__details">View details <ArrowUpRight size={15} aria-hidden="true" /></span>
            </>
          ) : !compact ? <p className="dest-card__desc muted">{destination.description}</p> : null}
          <div className="dest-card__tags">
            {destination.tags.slice(0, compact ? 2 : 3).map((t) => <span key={t}>{t}</span>)}
            {!compact ? <span>{destination.idealDays} days</span> : null}
          </div>
          {saveError ? <p className="dest-card__error" role="alert">{saveError}</p> : null}
        </div>
      </Link>
      <button
        type="button"
        className={`dest-card__save${saved ? ' is-saved' : ''}`}
        aria-label={saved ? `Remove ${destination.name} from wishlist` : `Save ${destination.name} to wishlist`}
        aria-pressed={saved}
        onClick={handleSave}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </article>
  );
}
