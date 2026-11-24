import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, CloudSun, Compass, Heart, Info, MapPin, Wallet,
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, ErrorState, IconButton, SectionHeading, Spinner, Stat,
} from '../components/ui';
import {
  destinations, getDestination, searchDestinations, categories, countries, cities, categoryLabel, photo,
} from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import { isLiveApi } from '../lib/api';
import { getWeather } from '../lib/weather';
import '../styles/trip-pages.css';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

export default function DestinationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { wishlist, toggleWishlist } = useTrips();
  const destination = getDestination(id);
  const [weather, setWeather] = useState({ status: 'loading', data: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authNotice, setAuthNotice] = useState(false);

  useEffect(() => {
    let active = true;
    if (!destination?.coords) {
      setWeather({ status: 'unavailable', data: null });
      return () => { active = false; };
    }
    setWeather({ status: 'loading', data: null });
    Promise.resolve(getWeather(destination.coords.lat, destination.coords.lng))
      .then((data) => {
        if (!active) return;
        setWeather(data ? { status: 'ready', data } : { status: 'unavailable', data: null });
      })
      .catch(() => { if (active) setWeather({ status: 'unavailable', data: null }); });
    return () => { active = false; };
  }, [destination?.id, destination?.coords?.lat, destination?.coords?.lng]);

  if (!destination) {
    return (
      <div className="page container tp-page">
        <EmptyState
          icon={Compass}
          title="Destination not found"
          description="That place isn't in the catalogue. Browse all destinations to find something else."
          action={<Button as={Link} to="/explore" icon={ArrowRight}>Browse destinations</Button>}
        />
      </div>
    );
  }

  const saved = Array.isArray(wishlist) && wishlist.includes(destination.id);
  const gallery = [destination.image, ...(destination.gallery || [])].filter(Boolean);

  const handleSave = async () => {
    if (isLiveApi() && !user) {
      setAuthNotice(true);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await toggleWishlist(destination.id);
    } catch {
      setError('We could not update your wishlist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page container tp-page">
      <nav aria-label="Breadcrumb" className="tp-meta-list" style={{ marginBottom: 'var(--s4)' }}>
        <Link className="muted" to="/explore">Explore</Link>
        <span aria-hidden="true">/</span>
        <span>{destination.name}</span>
      </nav>

      <div className="tp-detail-hero">
        <img className="tp-detail-hero__img" src={destination.image || photo(destination.id)} alt="" />
        <div className="tp-detail-hero__content">
          <Badge tone="emerald">{categoryLabel(destination.category)}</Badge>
          <h1>{destination.name}</h1>
          <p className="tp-dest-card__loc" style={{ fontSize: 'var(--t2)' }}>
            <MapPin size={16} aria-hidden="true" />
            {destination.city}, {destination.region}, {destination.country}
          </p>
        </div>
      </div>

      {gallery.length > 1 ? (
        <ul className="tp-gallery" aria-label={`Photos of ${destination.name}`}>
          {gallery.map((src, index) => (
            <li key={`${src}-${index}`}>
              <img src={src} alt={`${destination.name} — view ${index + 1}`} loading="lazy" />
            </li>
          ))}
        </ul>
      ) : null}

      {authNotice ? (
        <p className="tp-notice" role="status" style={{ marginTop: 'var(--s5)' }}>
          <Heart size={16} aria-hidden="true" />
          Sign in to sync your wishlist with an account. <Link to="/auth">Go to sign in</Link>
        </p>
      ) : null}
      {error ? (
        <div style={{ marginTop: 'var(--s5)' }}>
          <ErrorState title="Could not update your wishlist" description={error} />
        </div>
      ) : null}

      <div className="tp-detail-grid">
        <div className="tp-detail-section">
          <section aria-labelledby="tp-detail-about">
            <h2 id="tp-detail-about">About {destination.name}</h2>
            <p className="lead" style={{ marginTop: 'var(--s3)' }}>{destination.description}</p>
          </section>

          <section aria-labelledby="tp-detail-highlights">
            <h3 id="tp-detail-highlights">Highlights</h3>
            <ul className="tp-highlights">
              {destination.highlights.map((highlight) => (
                <li key={highlight}><Check size={16} aria-hidden="true" /><span>{highlight}</span></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="tp-detail-tags">
            <h3 id="tp-detail-tags">Good for</h3>
            <div className="tp-chips" style={{ marginBottom: 0 }}>
              {(destination.tags || []).map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          </section>

          <section aria-label="More places to consider">
            <SectionHeading
              eyebrow="Keep looking"
              title="More places to consider"
              description="Other destinations in the catalogue you might like."
              action={<Button as={Link} to="/explore" variant="ghost">All destinations</Button>}
            />
            <ul className="tp-inline-list" aria-label="Related destinations">
              {destinations
                .filter((d) => d.id !== destination.id && (d.country === destination.country || d.category === destination.category))
                .slice(0, 6)
                .map((d) => <li key={d.id}><Link className="accent" to={`/destinations/${d.id}`}>{d.name}</Link></li>)}
            </ul>
          </section>
        </div>

        <aside className="tp-detail-side" aria-label="Trip planning details">
          <Card>
            <div className="tp-detail-actions">
              <Button as={Link} to={`/create-trip?destination=${destination.id}`} iconRight={ArrowRight} full>
                Plan a trip here
              </Button>
              <IconButton
                label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                icon={Heart}
                aria-pressed={saved}
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving || undefined}
                className={saved ? 'tp-heart--saved' : ''}
              />
            </div>
            <p className="tp-live" role="status" aria-live="polite">
              {saving ? 'Updating wishlist…' : saved ? `${destination.name} is in your wishlist.` : ''}
            </p>
          </Card>

          <Card>
            <div className="tp-facts">
              <div className="tp-fact">
                <span className="tp-fact__icon"><CalendarDays size={18} aria-hidden="true" /></span>
                <div>
                  <p className="tp-fact__label">Typical stay</p>
                  <p className="tp-fact__value">{destination.idealDays} {destination.idealDays === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
              <div className="tp-fact">
                <span className="tp-fact__icon"><Wallet size={18} aria-hidden="true" /></span>
                <div>
                  <p className="tp-fact__label">Indicative estimate</p>
                  <p className="tp-fact__value">About {inr.format(destination.avgDailyINR)} per day</p>
                  <p className="tp-fact__note">Planning estimate in INR only — not a live price, quote or availability check.</p>
                </div>
              </div>
              <div className="tp-fact">
                <span className="tp-fact__icon"><MapPin size={18} aria-hidden="true" /></span>
                <div>
                  <p className="tp-fact__label">Coordinates</p>
                  <p className="tp-fact__value">{destination.coords.lat.toFixed(4)}, {destination.coords.lng.toFixed(4)}</p>
                  <p className="tp-fact__note"><Link className="accent" to={`/map?destination=${destination.id}`}>View on map</Link></p>
                </div>
              </div>
              <div className="tp-fact">
                <span className="tp-fact__icon"><CloudSun size={18} aria-hidden="true" /></span>
                <div>
                  <p className="tp-fact__label">Current weather estimate</p>
                  {weather.status === 'loading' ? <Spinner label="Loading weather estimate" /> : null}
                  {weather.status === 'unavailable' ? (
                    <p className="tp-fact__value">Unavailable right now</p>
                  ) : null}
                  {weather.status === 'ready' ? (
                    <div className="tp-weather">
                      <span className="tp-weather__temp">{Math.round(weather.data.temperature)}°C</span>
                      <span className="tp-fact__note">{weather.data.description}</span>
                    </div>
                  ) : null}
                  <p className="tp-fact__note">Open-Meteo estimate at the destination coordinates; it is not a forecast guarantee.</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Stat label="Catalogue entry" value={destination.name} hint={`${categoryLabel(destination.category)} · ${destination.country}`} />
            <p className="tp-fact__note" style={{ marginTop: 'var(--s3)' }}>
              <Info size={14} aria-hidden="true" /> Details are editorial reference information, not bookable inventory.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
