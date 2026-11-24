import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarRange, Check, Compass, Info, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, Chip, Field, Input, Select } from '../components/ui';
import {
  destinations, getDestination, searchDestinations, categories, countries, cities, categoryLabel, photo,
} from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import { isLiveApi } from '../lib/api';
import { todayISO } from '../utils/format';
import '../styles/trip-pages.css';

const STEPS = ['Basics', 'Preferences', 'Review'];
const PREFERENCE_OPTIONS = [
  'Food', 'Photography', 'Hiking', 'Nature', 'History', 'Shopping',
  'Nightlife', 'Wellness', 'Budget-friendly', 'Family-friendly',
];
const TRIP_TYPES = ['Adventure', 'Relaxation', 'Nature', 'Cultural', 'Family', 'Solo', 'Couple'];

const makeId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

const errorNode = (id, message) => (message ? <span id={id}>{message}</span> : undefined);

function validateStep(step, form) {
  const errors = {};
  if (step === 0) {
    if (!form.name.trim()) errors.name = 'Give your trip a name.';
    if (!form.origin.trim()) errors.origin = 'Enter the city you are starting from.';
    if (!form.destination || !getDestination(form.destination)) errors.destination = 'Choose a destination from the catalogue.';
    if (!form.startDate) errors.startDate = 'Choose a departure date.';
    if (!form.endDate) errors.endDate = 'Choose a return date.';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      errors.endDate = 'Return date must be after departure.';
    }
    const travellers = Number(form.travellers);
    if (!Number.isInteger(travellers) || travellers < 1 || travellers > 12) {
      errors.travellers = 'Choose between 1 and 12 travellers.';
    }
    const budget = Number(form.budget);
    if (!form.budget || !Number.isFinite(budget) || budget <= 0) {
      errors.budget = 'Enter a budget in INR greater than zero.';
    }
  }
  if (step === 1) {
    if (form.preferences.length === 0) errors.preferences = 'Pick at least one preference.';
    if (!TRIP_TYPES.includes(form.tripType)) errors.tripType = 'Choose a trip type.';
  }
  return errors;
}

const FOCUS_IDS = {
  name: 'trip-name', origin: 'trip-origin', destination: 'trip-destination',
  startDate: 'trip-start', endDate: 'trip-end', travellers: 'trip-travellers',
  budget: 'trip-budget', preferences: 'trip-pref-0', tripType: 'trip-type',
};

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

export default function CreateTrip() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destinationParam = searchParams.get('destination');
  const { user } = useAuth();
  const { saveTrip } = useTrips();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({
    name: '',
    origin: '',
    destination: destinationParam && getDestination(destinationParam) ? destinationParam : '',
    startDate: '',
    endDate: '',
    travellers: '2',
    budget: '',
    preferences: [],
    tripType: 'Adventure',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const today = useMemo(() => todayISO(), []);
  const selectedDestination = form.destination ? getDestination(form.destination) : null;

  useEffect(() => {
    if (destinationParam && getDestination(destinationParam)) {
      setForm((prev) => (prev.destination === destinationParam ? prev : { ...prev, destination: destinationParam }));
    }
  }, [destinationParam]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSaveError('');
  };

  const togglePreference = (preference) => {
    setForm((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter((p) => p !== preference)
        : [...prev.preferences, preference],
    }));
    setErrors((prev) => {
      if (!prev.preferences) return prev;
      const next = { ...prev };
      delete next.preferences;
      return next;
    });
  };

  const focusFirstError = (found) => {
    const first = Object.keys(found)[0];
    if (first && FOCUS_IDS[first]) document.getElementById(FOCUS_IDS[first])?.focus();
  };

  const goNext = () => {
    const found = validateStep(step, form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirstError(found);
      return;
    }
    setErrors({});
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  };

  const handleSave = async () => {
    const found = validateStep(0, form);
    const prefs = validateStep(1, form);
    if (Object.keys(found).length > 0 || Object.keys(prefs).length > 0) {
      setErrors({ ...found, ...prefs });
      setStep(Object.keys(found).length > 0 ? 0 : 1);
      return;
    }
    if (isLiveApi() && !user) {
      setSaveError('Sign in to save this trip to your account.');
      return;
    }
    setSaving(true);
    setSaveError('');
    const trip = {
      id: makeId(),
      name: form.name.trim(),
      origin: form.origin.trim(),
      destination: form.destination,
      destinationName: selectedDestination?.name || '',
      startDate: form.startDate,
      endDate: form.endDate,
      travellers: Number(form.travellers),
      budget: Number(form.budget),
      preferences: form.preferences,
      tripType: form.tripType,
      itinerary: [],
      expenses: [],
      status: 'planned',
      createdAt: new Date().toISOString(),
    };
    try {
      const saved = await saveTrip(trip);
      navigate(`/itinerary/${saved?.id || trip.id}`);
    } catch {
      setSaveError('We could not save your trip. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (step < STEPS.length - 1) goNext();
    else handleSave();
  };

  return (
    <div className="page container tp-page">
      <header className="tp-page-head">
        <div className="tp-page-head__text">
          <span className="eyebrow">Trip builder</span>
          <h1>Create a trip</h1>
          <p>Three short steps. Your answers stay on this page as you move back and forth; nothing is saved until you confirm.</p>
        </div>
        <Badge tone="emerald">Step {step + 1} of {STEPS.length}</Badge>
      </header>

      <ol className="tp-steps" aria-label="Trip creation progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            data-done={index < step ? 'true' : undefined}
          >
            <span className="tp-steps__num" aria-hidden="true">{index < step ? <Check size={14} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {!user ? (
        <p className="tp-notice" role="status" style={{ marginBottom: 'var(--s5)' }}>
          <Info size={16} aria-hidden="true" />
          Demo mode: trips save in this browser. <Link to="/auth">Sign in</Link> to keep them with an account.
        </p>
      ) : null}

      <div className="tp-form-layout">
        <form onSubmit={handleSubmit} noValidate>
          <Card>
            {step === 0 ? (
              <>
                <h2 style={{ fontSize: 'var(--t5)', marginBottom: 'var(--s5)' }}>Basics</h2>
                <div className="tp-form-grid">
                  <Field
                    label="Trip name" required htmlFor="trip-name"
                    hint={<span id="trip-name-hint">Something recognisable, like “Monsoon in Munnar”.</span>}
                    error={errorNode('trip-name-error', errors.name)}
                  >
                    <Input
                      id="trip-name" value={form.name} placeholder="My next trip"
                      onChange={(e) => update('name', e.target.value)}
                      invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'trip-name-error' : 'trip-name-hint'}
                    />
                  </Field>
                  <Field
                    label="Starting from" required htmlFor="trip-origin"
                    hint="City or airport you will depart from."
                    error={errorNode('trip-origin-error', errors.origin)}
                  >
                    <Input
                      id="trip-origin" value={form.origin} placeholder="e.g. Bengaluru"
                      onChange={(e) => update('origin', e.target.value)}
                      invalid={Boolean(errors.origin)}
                      aria-describedby={errors.origin ? 'trip-origin-error' : undefined}
                    />
                  </Field>
                  <Field
                    label="Destination" required htmlFor="trip-destination"
                    error={errorNode('trip-destination-error', errors.destination)}
                    className="tp-span-2"
                  >
                    <Select
                      id="trip-destination" value={form.destination}
                      onChange={(e) => update('destination', e.target.value)}
                      invalid={Boolean(errors.destination)}
                      aria-describedby={errors.destination ? 'trip-destination-error' : undefined}
                    >
                      <option value="">Choose a destination</option>
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} — {d.city}, {d.country}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Departure date" required htmlFor="trip-start"
                    error={errorNode('trip-start-error', errors.startDate)}
                  >
                    <Input
                      id="trip-start" type="date" value={form.startDate} min={today}
                      onChange={(e) => update('startDate', e.target.value)}
                      invalid={Boolean(errors.startDate)}
                      aria-describedby={errors.startDate ? 'trip-start-error' : undefined}
                    />
                  </Field>
                  <Field
                    label="Return date" required htmlFor="trip-end"
                    error={errorNode('trip-end-error', errors.endDate)}
                  >
                    <Input
                      id="trip-end" type="date" value={form.endDate} min={form.startDate || today}
                      onChange={(e) => update('endDate', e.target.value)}
                      invalid={Boolean(errors.endDate)}
                      aria-describedby={errors.endDate ? 'trip-end-error' : undefined}
                    />
                  </Field>
                  <Field
                    label="Travellers" required htmlFor="trip-travellers"
                    error={errorNode('trip-travellers-error', errors.travellers)}
                  >
                    <Input
                      id="trip-travellers" type="number" min="1" max="12" step="1" inputMode="numeric"
                      value={form.travellers} onChange={(e) => update('travellers', e.target.value)}
                      invalid={Boolean(errors.travellers)}
                      aria-describedby={errors.travellers ? 'trip-travellers-error' : undefined}
                    />
                  </Field>
                  <Field
                    label="Budget (INR)" required htmlFor="trip-budget"
                    error={errorNode('trip-budget-error', errors.budget)}
                  >
                    <Input
                      id="trip-budget" type="number" min="1" step="100" inputMode="numeric"
                      value={form.budget} placeholder="25000"
                      onChange={(e) => update('budget', e.target.value)}
                      invalid={Boolean(errors.budget)}
                      aria-describedby={errors.budget ? 'trip-budget-error' : undefined}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2 style={{ fontSize: 'var(--t5)', marginBottom: 'var(--s5)' }}>Preferences</h2>
                <div className="tp-form-grid">
                  <div className="ui-field tp-span-2">
                    <span className="ui-field__label" id="trip-prefs-label">Preferences <span aria-hidden="true">*</span></span>
                    <div
                      className="tp-pref-grid"
                      role="group"
                      aria-labelledby="trip-prefs-label"
                      aria-describedby={errors.preferences ? 'trip-preferences-error' : undefined}
                      aria-invalid={Boolean(errors.preferences) || undefined}
                    >
                      {PREFERENCE_OPTIONS.map((preference, index) => (
                        <Chip
                          key={preference}
                          id={index === 0 ? 'trip-pref-0' : undefined}
                          active={form.preferences.includes(preference)}
                          onClick={() => togglePreference(preference)}
                        >
                          {preference}
                        </Chip>
                      ))}
                    </div>
                    {errors.preferences ? (
                      <p className="ui-field__error" id="trip-preferences-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />{errors.preferences}
                      </p>
                    ) : <p className="ui-field__hint">Pick at least one. These guide the demo plan suggestions.</p>}
                  </div>
                  <Field
                    label="Trip type" required htmlFor="trip-type" className="tp-span-2"
                    error={errorNode('trip-type-error', errors.tripType)}
                  >
                    <Select
                      id="trip-type" value={form.tripType}
                      onChange={(e) => update('tripType', e.target.value)}
                      invalid={Boolean(errors.tripType)}
                      aria-describedby={errors.tripType ? 'trip-type-error' : undefined}
                    >
                      {TRIP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </Select>
                  </Field>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 style={{ fontSize: 'var(--t5)', marginBottom: 'var(--s5)' }}>Review your trip</h2>
                <p className="muted" style={{ marginBottom: 'var(--s5)' }}>
                  Check the details below. Saving creates an empty itinerary you can build next.
                </p>
                <dl className="tp-summary-list">
                  <div className="tp-summary-item"><dt>Trip name</dt><dd>{form.name}</dd></div>
                  <div className="tp-summary-item"><dt>Starting from</dt><dd>{form.origin}</dd></div>
                  <div className="tp-summary-item"><dt>Destination</dt><dd>{selectedDestination?.name || '—'}</dd></div>
                  <div className="tp-summary-item"><dt>Trip type</dt><dd>{form.tripType}</dd></div>
                  <div className="tp-summary-item"><dt>Dates</dt><dd>{form.startDate} → {form.endDate}</dd></div>
                  <div className="tp-summary-item"><dt>Travellers</dt><dd>{form.travellers}</dd></div>
                  <div className="tp-summary-item"><dt>Budget</dt><dd>{inr.format(Number(form.budget))} (INR)</dd></div>
                  <div className="tp-summary-item"><dt>Preferences</dt><dd>{form.preferences.join(', ')}</dd></div>
                </dl>
                {saveError ? (
                  <div style={{ marginTop: 'var(--s5)' }}>
                    <p className="tp-notice tp-notice--error" role="alert">{saveError}</p>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="tp-form-actions">
              <Button type="button" variant="ghost" icon={ArrowLeft} onClick={goBack} disabled={step === 0 || saving}>
                Back
              </Button>
              <div className="tp-form-actions__right">
                {step < STEPS.length - 1 ? (
                  <Button type="submit" iconRight={ArrowRight}>Next: {STEPS[step + 1]}</Button>
                ) : (
                  <Button type="submit" icon={Check} loading={saving} disabled={!user}>
                    {saving ? 'Saving…' : 'Save trip'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </form>

        <aside className="tp-detail-side" aria-label="Trip builder guidance">
          <Card>
            <h3 style={{ fontSize: 'var(--t4)', marginBottom: 'var(--s3)' }}>What happens next</h3>
            <ul className="tp-aside-list">
              <li><Check size={16} aria-hidden="true" /><span>Save the trip to create an empty itinerary.</span></li>
              <li><Check size={16} aria-hidden="true" /><span>Add days, activities and times on the itinerary screen.</span></li>
              <li><Check size={16} aria-hidden="true" /><span>Track expenses against your INR budget.</span></li>
              <li><Check size={16} aria-hidden="true" /><span>See the route on the map once places are added.</span></li>
            </ul>
          </Card>
          {selectedDestination ? (
            <Card>
              <div className="media" style={{ borderRadius: 'var(--r2)', aspectRatio: '16 / 9' }}>
                <img src={selectedDestination.image || photo(selectedDestination.id)} alt="" loading="lazy" />
              </div>
              <h3 style={{ fontSize: 'var(--t4)', marginTop: 'var(--s3)' }}>{selectedDestination.name}</h3>
              <p className="muted" style={{ fontSize: 'var(--t2)' }}>{selectedDestination.city}, {selectedDestination.region}, {selectedDestination.country}</p>
              <div className="tp-chips" style={{ marginBottom: 0, marginTop: 'var(--s3)' }}>
                <Badge tone="emerald">{categoryLabel(selectedDestination.category)}</Badge>
                <Badge>{selectedDestination.idealDays} days typical</Badge>
              </div>
              <p className="tp-fact__note" style={{ marginTop: 'var(--s3)' }}>
                <Info size={14} aria-hidden="true" /> Daily spend estimates are indicative only, never live prices.
              </p>
            </Card>
          ) : (
            <Card>
              <Compass size={24} aria-hidden="true" className="accent" />
              <h3 style={{ fontSize: 'var(--t4)', marginTop: 'var(--s3)' }}>Pick a place</h3>
              <p className="muted" style={{ fontSize: 'var(--t2)', marginTop: 'var(--s2)' }}>
                Choose a destination in Basics to see a preview here, or <Link className="accent" to="/explore">browse all places</Link>.
              </p>
            </Card>
          )}
          <Card>
            <ShieldCheck size={22} aria-hidden="true" className="accent" />
            <p className="tp-fact__value" style={{ marginTop: 'var(--s2)' }}>Your data stays yours</p>
            <p className="tp-fact__note" style={{ marginTop: 'var(--s2)' }}>
              Trips are stored for your account. Demo planning output is clearly labelled and never presented as a live booking.
            </p>
          </Card>
          <p className="dim" style={{ fontSize: 'var(--t1)' }}>
            <CalendarRange size={14} aria-hidden="true" /> Dates use your local calendar.
          </p>
        </aside>
      </div>
    </div>
  );
}
