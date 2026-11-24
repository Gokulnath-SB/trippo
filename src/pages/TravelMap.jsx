import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Info, MapPin, Search, Route } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input } from '../components/ui';
import {
  destinations, getDestination, searchDestinations, categories, countries, cities, categoryLabel, photo,
} from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import useReducedMotion from '../hooks/useReducedMotion';
import '../styles/trip-pages.css';

const destinationIcon = L.divIcon({
  className: 'tp-map-pin',
  html: '<span class="tp-map-pin__dot"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
const activityIcon = L.divIcon({
  className: 'tp-map-pin tp-map-pin--activity',
  html: '<span class="tp-map-pin__dot"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const DEFAULT_CENTER = [20.6, 78.9];

function MapFocus({ focus }) {
  const map = useMap();
  const reduced = useReducedMotion();
  useEffect(() => { map.invalidateSize(); }, [map]);
  useEffect(() => {
    if (!focus) return;
    if (reduced) map.setView([focus.lat, focus.lng], focus.zoom || 11, { animate: false });
    else map.flyTo([focus.lat, focus.lng], focus.zoom || 11, { duration: 0.8 });
  }, [map, reduced, focus?.lat, focus?.lng, focus?.zoom, focus?.key]);
  return null;
}

function findDestinationByName(name) {
  const query = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (query.length < 3) return null;
  return destinations.find((destination) => {
    const labels = [destination.name, destination.city, destination.region, ...(destination.highlights || [])];
    return labels.some((label) => {
      const value = String(label).toLowerCase();
      return value === query || (query.length > 3 && (value.includes(query) || query.includes(value)));
    });
  }) || null;
}

function distanceKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function TravelMap() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const { trips, loading } = useTrips();
  const { user } = useAuth();

  const trip = useMemo(() => trips.find((item) => item.id === routeId), [trips, routeId]);
  const destinationFromRoute = getDestination(routeId) || getDestination(searchParams.get('destination'));
  const primaryDestination = trip ? getDestination(trip.destination) : destinationFromRoute;

  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(null);
  const focusCounter = useRef(0);

  const points = useMemo(() => {
    const collected = [];
    const add = (point) => {
      const key = `${point.name}|${point.lat}|${point.lng}`;
      if (!collected.some((item) => `${item.name}|${item.lat}|${item.lng}` === key)) collected.push(point);
    };

    const addDestination = (destination) => add({
      key: destination.id,
      name: destination.name,
      lat: destination.coords.lat,
      lng: destination.coords.lng,
      kind: 'destination',
      detail: `${destination.city}, ${destination.country}`,
    });

    if (primaryDestination) {
      addDestination(primaryDestination);
    } else if (!trip) {
      // Bare /map: pin a small sample of the real catalogue instead of showing an empty map.
      destinations.slice(0, 3).forEach(addDestination);
    }

    if (trip && Array.isArray(trip.itinerary)) {
      trip.itinerary.forEach((day) => {
        (Array.isArray(day.activities) ? day.activities : []).forEach((activity) => {
          const match = findDestinationByName(activity.location);
          if (!match) return;
          add({
            key: `${day.id || day.day}-${activity.id}`,
            name: activity.title || match.name,
            lat: match.coords.lat,
            lng: match.coords.lng,
            kind: 'activity',
            detail: activity.location || `${match.city}, ${match.country}`,
          });
        });
      });
    }
    return collected;
  }, [primaryDestination, trip]);

  const anchor = focus || primaryDestination?.coords || null;

  const nearby = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = destinations.filter((destination) => {
      if (!term) return true;
      return [destination.name, destination.city, destination.region, destination.country,
        categoryLabel(destination.category), ...(destination.tags || [])]
        .join(' ').toLowerCase().includes(term);
    });
    return filtered.sort((a, b) => {
      if (anchor) return distanceKm(anchor, a.coords) - distanceKm(anchor, b.coords);
      return a.name.localeCompare(b.name);
    });
  }, [query, anchor?.lat, anchor?.lng]);

  const focusOn = (point, zoom = 11) => {
    focusCounter.current += 1;
    setFocus({ lat: point.lat, lng: point.lng, zoom, key: focusCounter.current });
  };

  const centre = primaryDestination?.coords
    ? [primaryDestination.coords.lat, primaryDestination.coords.lng]
    : DEFAULT_CENTER;
  const initialZoom = primaryDestination ? 8 : 4;
  const missingTrip = Boolean(routeId) && !trip && !destinationFromRoute;

  return (
    <div className="page container tp-page">
      <header className="tp-page-head">
        <div className="tp-page-head__text">
          <span className="eyebrow">Travel map</span>
          <h1 className="page-title">{trip ? trip.name : primaryDestination ? `Around ${primaryDestination.name}` : 'Explore the map'}</h1>
          <p className="muted">
            OpenStreetMap tiles, no API key required. Markers show your trip destination and activities that match catalogue places; with no trip selected, a few catalogue places are pinned.
          </p>
        </div>
        <div className="tp-summary-bar__actions">
          {trip ? <Button as={Link} to={`/itinerary/${trip.id}`} variant="secondary" icon={Route}>Itinerary</Button> : null}
          <Button as={Link} to="/explore" variant="secondary" icon={Compass}>Explore places</Button>
        </div>
      </header>

      {missingTrip ? (
        <p className="tp-notice" role="status" style={{ marginBottom: 'var(--s5)' }}>
          <Info size={16} aria-hidden="true" />
          We couldn't find that trip or destination. Showing the full catalogue instead — <Link to="/explore">browse destinations</Link>.
        </p>
      ) : null}

      {loading ? <p className="tp-count" role="status">Loading your trips…</p> : null}

      <div className="tp-map-layout">
        <aside className="tp-map-side" aria-label="Map places">
          <Card>
            <Field label="Find a destination" htmlFor="tp-map-search">
              <div className="tp-search">
                <Search size={18} aria-hidden="true" />
                <Input
                  id="tp-map-search" type="search" placeholder="Search by name, city or country"
                  value={query} onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </Field>
            <p className="tp-fact__note" style={{ marginTop: 'var(--s3)' }}>
              {anchor ? 'Sorted by distance from the current map focus.' : 'Sorted alphabetically.'}
            </p>
          </Card>

          {points.length > 0 ? (
            <Card>
              <h2 style={{ fontSize: 'var(--t4)', marginBottom: 'var(--s3)' }}>On this map</h2>
              <ul className="tp-map-list">
                {points.map((point) => (
                  <li key={point.key}>
                    <button
                      type="button"
                      className="tp-map-item"
                      aria-pressed={focus?.lat === point.lat && focus?.lng === point.lng}
                      onClick={() => focusOn(point, 12)}
                    >
                      <span className="tp-map-item__name">
                        <MapPin size={14} aria-hidden="true" /> {point.name}
                      </span>
                      <span className="tp-map-item__meta">
                        {point.kind === 'activity' ? 'Activity' : 'Destination'}
                        {anchor ? ` · ${Math.round(distanceKm(anchor, point))} km` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <div className="row row--between wrap" style={{ marginBottom: 'var(--s3)' }}>
              <h2 style={{ fontSize: 'var(--t4)' }}>Nearby destinations</h2>
              <Badge>{nearby.length}</Badge>
            </div>
            {nearby.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matches"
                description="Try a different search term to find a destination."
              />
            ) : (
              <ul className="tp-map-list">
                {nearby.slice(0, 20).map((destination) => (
                  <li key={destination.id}>
                    <button
                      type="button"
                      className="tp-map-item"
                      aria-pressed={primaryDestination?.id === destination.id && !focus}
                      onClick={() => focusOn({
                        lat: destination.coords.lat, lng: destination.coords.lng, name: destination.name,
                      }, 9)}
                    >
                      <span>
                        <span className="tp-map-item__name">{destination.name}</span>
                        <span className="tp-map-item__meta" style={{ display: 'block' }}>
                          {destination.city}, {destination.country}{anchor ? ` · ${Math.round(distanceKm(anchor, destination.coords))} km` : ''}
                        </span>
                      </span>
                      <Badge>{categoryLabel(destination.category)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {user ? null : (
            <p className="tp-fact__note"><Info size={14} aria-hidden="true" /> Sign in to save trips from the explore and detail pages.</p>
          )}
        </aside>

        <div className="tp-map-shell">
          <MapContainer center={centre} zoom={initialZoom} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocus focus={focus} />
            {points.map((point) => (
              <Marker
                key={point.key}
                position={[point.lat, point.lng]}
                icon={point.kind === 'activity' ? activityIcon : destinationIcon}
                eventHandlers={{ click: () => focusOn(point, 12) }}
              >
                <Popup>
                  <strong>{point.name}</strong><br />
                  {point.detail}
                </Popup>
              </Marker>
            ))}
            {points.length >= 2 ? (
              <Polyline
                positions={points.map((point) => [point.lat, point.lng])}
                pathOptions={{ className: 'tp-map-route' }}
              />
            ) : null}
          </MapContainer>
        </div>
      </div>

      <p className="tp-fact__note" style={{ marginTop: 'var(--s5)' }}>
        Map data © OpenStreetMap contributors. Place coordinates come from the local catalogue; activity markers require a matching catalogue place. No map API key or secret is used.
      </p>
    </div>
  );
}
