import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, Compass, Info,
  MapPinned, Pencil, Plus, Route, Sparkles, Trash2, Wallet, X,
} from 'lucide-react';
import {
  Badge, Button, EmptyState, ErrorState, Field, IconButton, Input, Modal, Select, Spinner,
  Textarea,
} from '../components/ui';
import {
  destinations, getDestination, searchDestinations, categories, countries, cities, categoryLabel, photo,
} from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import { generatePlan } from '../lib/ai';
import { isLiveApi } from '../lib/api';
import '../styles/trip-pages.css';

const SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];

const makeId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function dateRange(start, end) {
  if (!start || !end || end < start) return [];
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let guard = 0;
  while (cursor <= last && guard < 60) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

function buildDays(trip) {
  const dates = dateRange(trip.startDate, trip.endDate);
  const existing = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const highest = existing.reduce((max, day) => Math.max(max, Number(day.day) || 0), 0);
  const count = Math.min(60, Math.max(dates.length, highest, 1));
  return Array.from({ length: count }, (_, index) => {
    const dayNumber = index + 1;
    const found = existing.find((day) => Number(day.day) === dayNumber);
    return {
      id: found?.id || `${trip.id}-day-${dayNumber}`,
      day: dayNumber,
      date: found?.date || dates[index] || '',
      activities: Array.isArray(found?.activities) ? found.activities : [],
    };
  });
}

const normaliseTime = (value) => {
  const slot = String(value || '').toLowerCase();
  if (SLOTS.some((s) => s.id === slot)) return slot;
  if (slot.includes('morning')) return 'morning';
  if (slot.includes('evening') || slot.includes('night')) return 'evening';
  if (slot.includes('afternoon') || slot.includes('noon')) return 'afternoon';
  return 'morning';
};

const errorNode = (id, message) => (message ? <span id={id}>{message}</span> : undefined);

export default function Itinerary() {
  const { id } = useParams();
  const { user } = useAuth();
  const { trips, saveTrip, loading: tripsLoading } = useTrips();
  const trip = useMemo(() => trips.find((item) => item.id === id), [trips, id]);

  const [days, setDays] = useState([]);
  const dirtyRef = useRef(false);
  const [editor, setEditor] = useState(null);
  const [editorErrors, setEditorErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!trip || dirtyRef.current) return;
    setDays(buildDays(trip));
  }, [trip]);

  if (tripsLoading) {
    return <div className="page container tp-page"><Spinner label="Loading itinerary" /></div>;
  }

  if (!trip) {
    return (
      <div className="page container tp-page">
        <EmptyState
          as="h1"
          icon={Compass}
          title="Trip not found"
          description="This trip isn't in your saved trips. Go back to your trips to choose another one."
          action={<Button as={Link} to="/my-trips" icon={ArrowLeft}>My trips</Button>}
        />
      </div>
    );
  }

  const destination = getDestination(trip.destination);
  const destinationName = trip.destinationName || destination?.name || 'your destination';
  const totalActivities = days.reduce((sum, day) => sum + day.activities.length, 0);

  const mutateDays = (updater) => {
    dirtyRef.current = true;
    setMessage('');
    setSaveError('');
    setDays((prev) => updater(prev));
  };

  const updateDay = (dayId, patch) => {
    mutateDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, ...patch } : day)));
  };

  const startCreate = (dayId, time = 'morning') => {
    setEditorErrors({});
    setEditor({ dayId, activityId: null, values: { time, title: '', description: '', location: '' } });
  };

  const startEdit = (dayId, activity) => {
    setEditorErrors({});
    setEditor({
      dayId,
      activityId: activity.id,
      values: {
        time: activity.time || 'morning',
        title: activity.title || '',
        description: activity.description || '',
        location: activity.location || '',
      },
    });
  };

  const updateEditor = (key, value) => {
    setEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
    setEditorErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveActivity = () => {
    if (!editor) return;
    const values = editor.values;
    const found = {};
    if (!values.title.trim()) found.title = 'Add a short title for this activity.';
    if (Object.keys(found).length > 0) {
      setEditorErrors(found);
      document.getElementById('tp-activity-title')?.focus();
      return;
    }
    const activity = {
      id: editor.activityId || makeId(),
      time: normaliseTime(values.time),
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.location.trim(),
    };
    const { dayId, activityId } = editor;
    mutateDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: activityId
          ? day.activities.map((item) => (item.id === activityId ? activity : item))
          : [...day.activities, activity],
      };
    }));
    setEditor(null);
    setEditorErrors({});
  };

  const removeActivity = (dayId, activityId) => {
    mutateDays((prev) => prev.map((day) => (
      day.id === dayId ? { ...day, activities: day.activities.filter((item) => item.id !== activityId) } : day
    )));
    if (editor?.activityId === activityId) setEditor(null);
  };

  const moveActivity = (dayId, index, direction) => {
    mutateDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;
      const target = index + direction;
      if (target < 0 || target >= day.activities.length) return day;
      const activities = [...day.activities];
      [activities[index], activities[target]] = [activities[target], activities[index]];
      return { ...day, activities };
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError('');
    try {
      const plan = await generatePlan({
        origin: trip.origin,
        destination: trip.destination,
        destinationName,
        destinationId: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travellers: trip.travellers,
        budget: trip.budget,
        preferences: trip.preferences || [],
        tripType: trip.tripType,
        days: days.length,
      });
      if (!plan || !Array.isArray(plan.itinerary)) throw new Error('No itinerary was returned.');
      setProposal(plan);
    } catch {
      setAiError('Demo plan generation is unavailable right now. You can still add activities manually.');
    } finally {
      setGenerating(false);
    }
  };

  const confirmProposal = () => {
    if (!proposal) return;
    const generated = proposal.itinerary.map((day, index) => ({
      day: Number(day.day) || index + 1,
      date: day.date || '',
      activities: (Array.isArray(day.activities) ? day.activities : []).map((activity) => ({
        id: makeId(),
        time: normaliseTime(activity.time),
        title: activity.title || 'Untitled activity',
        description: activity.description || '',
        location: activity.location || '',
      })),
    }));
    mutateDays((prev) => {
      const next = prev.map((day, index) => (generated[index]
        ? { ...day, date: generated[index].date || day.date, activities: generated[index].activities }
        : day));
      generated.slice(next.length).forEach((day) => {
        next.push({ id: makeId(), day: next.length + 1, date: day.date, activities: day.activities });
      });
      return next;
    });
    setProposal(null);
    setMessage('Demo plan added to your draft. Review it, then save when you are ready.');
  };

  const handleSave = async () => {
    if (isLiveApi() && !user) {
      setSaveError('Sign in to save this itinerary to your account.');
      return;
    }
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      const itinerary = days.map((day) => ({
        id: day.id, day: day.day, date: day.date, activities: day.activities,
      }));
      const saved = await saveTrip({ ...trip, itinerary });
      dirtyRef.current = false;
      setDays(buildDays(saved || { ...trip, itinerary }));
      setMessage('Itinerary saved.');
    } catch {
      setSaveError('We could not save this itinerary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page container tp-page">
      <nav aria-label="Breadcrumb" className="tp-meta-list" style={{ marginBottom: 'var(--s4)' }}>
        <Link className="muted" to="/my-trips">My trips</Link>
        <span aria-hidden="true">/</span>
        <span>{trip.name}</span>
      </nav>

      <header className="tp-page-head">
        <div className="tp-page-head__text">
          <span className="eyebrow">Itinerary</span>
          <h1 className="page-title">{trip.name}</h1>
          <ul className="tp-meta-list">
            <li><MapPinned size={16} aria-hidden="true" />{destinationName}</li>
            <li><CalendarDays size={16} aria-hidden="true" />{trip.startDate || 'Date not set'} → {trip.endDate || 'Date not set'}</li>
            <li><Route size={16} aria-hidden="true" />{totalActivities} {totalActivities === 1 ? 'activity' : 'activities'}</li>
          </ul>
        </div>
        <div className="tp-summary-bar__actions">
          <Button as={Link} to={`/budget/${trip.id}`} variant="secondary" icon={Wallet}>Budget</Button>
          <Button as={Link} to={`/map/${trip.id}`} variant="secondary" icon={MapPinned}>Map</Button>
        </div>
      </header>

      {!user ? (
        <p className="tp-notice" role="status" style={{ marginBottom: 'var(--s5)' }}>
          <Info size={16} aria-hidden="true" />
          Demo mode: edits save in this browser. <Link to="/auth">Sign in</Link> to keep them with an account.
        </p>
      ) : null}

      <div className="tp-summary-bar">
        <div className="tp-summary-bar__meta">
          <Badge tone="emerald">{destination?.country || 'Destination'}</Badge>
          <Badge>{trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'}</Badge>
          <Badge>{trip.tripType}</Badge>
          <Badge>{days.length} {days.length === 1 ? 'day' : 'days'}</Badge>
        </div>
        <div className="tp-summary-bar__actions">
          <Button variant="secondary" icon={Sparkles} onClick={handleGenerate} loading={generating}>
            {generating ? 'Generating…' : 'Generate with AI'}
          </Button>
          <Button icon={Check} onClick={handleSave} loading={saving} disabled={!user}>
            {saving ? 'Saving…' : 'Save itinerary'}
          </Button>
        </div>
      </div>

      <p className="tp-live" role="status" aria-live="polite">{message}</p>
      {saveError ? <p className="tp-notice tp-notice--error" role="alert" style={{ marginTop: 'var(--s2)' }}>{saveError}</p> : null}
      {aiError ? (
        <div style={{ marginTop: 'var(--s3)' }}>
          <ErrorState title="Demo plan unavailable" description={aiError} />
        </div>
      ) : null}

      {totalActivities === 0 ? (
        <div style={{ marginBlock: 'var(--s5)' }}>
          <EmptyState
            icon={Route}
            title="No activities yet"
            description="Add your first activity, or use the demo plan generator for a starting point."
            action={<Button icon={Plus} onClick={() => startCreate(days[0]?.id, 'morning')}>Add first activity</Button>}
          />
        </div>
      ) : null}

      <div className="tp-day-grid">
        {days.map((day) => (
          <section className="tp-day" key={day.id} aria-labelledby={`tp-day-${day.day}-title`}>
            <div className="tp-day__head">
              <h3 id={`tp-day-${day.day}-title`}>Day {day.day}</h3>
              <div className="tp-day__date">
                <label className="sr-only" htmlFor={`tp-day-date-${day.day}`}>Date for day {day.day}</label>
                <Input
                  id={`tp-day-date-${day.day}`}
                  type="date"
                  value={day.date}
                  onChange={(e) => updateDay(day.id, { date: e.target.value })}
                />
              </div>
            </div>

            <div className="tp-day__list">
              {SLOTS.map((slot) => {
                const slotActivities = day.activities
                  .map((activity, index) => ({ activity, index }))
                  .filter(({ activity }) => normaliseTime(activity.time) === slot.id);
                return (
                  <div key={slot.id}>
                    <p className="tp-fact__label" style={{ marginBottom: 'var(--s2)' }}>{slot.label}</p>
                    <div className="stack" style={{ gap: 'var(--s2)' }}>
                      {slotActivities.map(({ activity, index }) => {
                        const isEditing = editor?.activityId === activity.id;
                        if (isEditing) {
                          return (
                            <div className="tp-activity tp-activity-edit" key={activity.id}>
                              <div className="tp-form-grid tp-span-2">
                                <Field label="Title" required htmlFor="tp-activity-title" className="tp-span-2"
                                  error={errorNode('tp-activity-title-error', editorErrors.title)}>
                                  <Input
                                    id="tp-activity-title" value={editor.values.title}
                                    onChange={(e) => updateEditor('title', e.target.value)}
                                    invalid={Boolean(editorErrors.title)}
                                    aria-describedby={editorErrors.title ? 'tp-activity-title-error' : undefined}
                                  />
                                </Field>
                                <Field label="Time" htmlFor="tp-activity-time" className="tp-span-2">
                                  <Select id="tp-activity-time" value={editor.values.time}
                                    onChange={(e) => updateEditor('time', e.target.value)}>
                                    {SLOTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                                  </Select>
                                </Field>
                                <Field label="Description" htmlFor="tp-activity-description" className="tp-span-2">
                                  <Textarea id="tp-activity-description" value={editor.values.description}
                                    onChange={(e) => updateEditor('description', e.target.value)} />
                                </Field>
                                <Field label="Location" htmlFor="tp-activity-location" className="tp-span-2">
                                  <Input id="tp-activity-location" value={editor.values.location}
                                    placeholder="Place or address"
                                    onChange={(e) => updateEditor('location', e.target.value)} />
                                </Field>
                              </div>
                              <div className="tp-activity-edit__actions">
                                <Button icon={Check} onClick={saveActivity}>Save activity</Button>
                                <Button variant="ghost" icon={X} onClick={() => { setEditor(null); setEditorErrors({}); }}>Cancel</Button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <article className="tp-activity" key={activity.id}>
                            <div className="tp-activity__head">
                              <div className="tp-activity__text">
                                <p className="tp-activity__title">{activity.title}</p>
                                {activity.description ? <p className="tp-activity__desc">{activity.description}</p> : null}
                                {activity.location ? (
                                  <p className="tp-activity__loc"><MapPinned size={13} aria-hidden="true" />{activity.location}</p>
                                ) : null}
                              </div>
                              <div className="tp-activity__tools">
                                <IconButton label={`Move ${activity.title} up`} icon={ArrowUp} onClick={() => moveActivity(day.id, index, -1)} disabled={index === 0} />
                                <IconButton label={`Move ${activity.title} down`} icon={ArrowDown} onClick={() => moveActivity(day.id, index, 1)} disabled={index === day.activities.length - 1} />
                                <IconButton label={`Edit ${activity.title}`} icon={Pencil} onClick={() => startEdit(day.id, activity)} />
                                <IconButton label={`Remove ${activity.title}`} icon={Trash2} onClick={() => removeActivity(day.id, activity.id)} />
                              </div>
                            </div>
                          </article>
                        );
                      })}
                      {editor?.dayId === day.id && !editor.activityId && editor.values.time === slot.id ? (
                        <div className="tp-activity tp-activity-edit">
                          <div className="tp-form-grid tp-span-2">
                            <Field label="Title" required htmlFor="tp-activity-title" className="tp-span-2"
                              error={errorNode('tp-activity-title-error', editorErrors.title)}>
                              <Input id="tp-activity-title" value={editor.values.title} placeholder="e.g. Sunset at the lake"
                                onChange={(e) => updateEditor('title', e.target.value)}
                                invalid={Boolean(editorErrors.title)}
                                aria-describedby={editorErrors.title ? 'tp-activity-title-error' : undefined} />
                            </Field>
                            <Field label="Time" htmlFor="tp-activity-time" className="tp-span-2">
                              <Select id="tp-activity-time" value={editor.values.time}
                                onChange={(e) => updateEditor('time', e.target.value)}>
                                {SLOTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                              </Select>
                            </Field>
                            <Field label="Description" htmlFor="tp-activity-description" className="tp-span-2">
                              <Textarea id="tp-activity-description" value={editor.values.description}
                                onChange={(e) => updateEditor('description', e.target.value)} />
                            </Field>
                            <Field label="Location" htmlFor="tp-activity-location" className="tp-span-2">
                              <Input id="tp-activity-location" value={editor.values.location}
                                placeholder="Place or address"
                                onChange={(e) => updateEditor('location', e.target.value)} />
                            </Field>
                          </div>
                          <div className="tp-activity-edit__actions">
                            <Button icon={Check} onClick={saveActivity}>Save activity</Button>
                            <Button variant="ghost" icon={X} onClick={() => { setEditor(null); setEditorErrors({}); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : null}
                      <Button
                        variant="ghost" icon={Plus} className="tp-day__add"
                        onClick={() => startCreate(day.id, slot.id)}
                      >
                        Add {slot.label.toLowerCase()}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Modal
        open={Boolean(proposal)}
        onClose={() => setProposal(null)}
        title="Demo generated itinerary"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setProposal(null)}>Cancel</Button>
            <Button icon={Check} onClick={confirmProposal}>Replace draft itinerary</Button>
          </>
        )}
      >
        <div className="tp-modal-stack">
          <Badge tone="warning">DEMO GENERATED · MODE: {String(proposal?.mode || 'demo').toUpperCase()}</Badge>
          <p className="muted">
            This is a sample plan built from your trip details. It is not a live booking, price or availability check.
            Nothing changes until you confirm.
          </p>
          {proposal?.summary ? <p>{proposal.summary}</p> : null}
          {Array.isArray(proposal?.suggestions) && proposal.suggestions.length > 0 ? (
            <ul className="tp-suggestions">
              {proposal.suggestions.map((suggestion, index) => <li key={`${suggestion}-${index}`}><Check size={15} aria-hidden="true" />{suggestion}</li>)}
            </ul>
          ) : null}
          <div className="tp-ai-plan">
            {(proposal?.itinerary || []).map((day, index) => (
              <div className="tp-ai-plan__day" key={`${day.day || index}`}>
                <h4>Day {day.day || index + 1}{day.date ? ` · ${day.date}` : ''}</h4>
                {(day.activities || []).map((activity, activityIndex) => (
                  <p key={`${activity.id || activity.title}-${activityIndex}`}>
                    <strong>{SLOTS.find((slot) => slot.id === normaliseTime(activity.time))?.label || 'Activity'}:</strong> {activity.title}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <p className="dim" style={{ fontSize: 'var(--t1)', marginTop: 'var(--s6)' }}>
        <ArrowRight size={14} aria-hidden="true" /> Editing builds a local draft. Use “Save itinerary” to persist it.
      </p>
    </div>
  );
}
