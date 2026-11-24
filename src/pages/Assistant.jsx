import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles, UserRound, AlertCircle } from 'lucide-react';
import { Button, Card, Badge, EmptyState } from '../components/ui';
import { destinations, getDestination } from '../data/destinations';
import { generatePlan } from '../lib/ai';
import { useTrips } from '../context/TripsContext';
import { inr, todayISO } from '../utils/format';
import '../styles/pages-main.css';

const suggestions = [
  'I want to travel from Chennai to Ooty for 3 days with a budget of ₹8,000.',
  'Plan a relaxed 4 day beach trip to Goa for 2 travellers.',
  'What could a 5 day culture trip to Jaipur look like?',
];

// Date-only arithmetic in UTC so timezone offsets cannot shift the calendar day.
const addDays = (iso, days) => {
  const [year, month, day] = String(iso).split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function parseRequest(text) {
  const lower = text.toLowerCase();
  const found = destinations.find((d) => lower.includes(d.name.toLowerCase()) || lower.includes(d.city.toLowerCase()))
    || destinations.find((d) => lower.includes(d.region.toLowerCase()));
  const explicit = lower.match(/\bto\s+([a-z][a-z .'-]{1,28})/);
  const destinationName = found?.name || (explicit ? explicit[1].trim().replace(/\s+(for|with|on|in)$/, '') : 'Ooty');
  const originMatch = lower.match(/\bfrom\s+([a-z][a-z .'-]{1,28}?)\s+(?:to|for|with|,|$)/);
  const daysMatch = lower.match(/(\d+)\s*days?/);
  const budgetMatch = text.match(/₹\s*([\d,]+)|(?:\bbudget\b|\brs\.?\b|\binr\b)\s*([\d,]+)/i);
  const peopleMatch = lower.match(/(\d+)\s*(?:travellers|travelers|people|persons)/);
  const days = Math.min(14, Math.max(1, daysMatch ? Number(daysMatch[1]) : 3));
  const budget = budgetMatch ? Number((budgetMatch[1] || budgetMatch[2]).replace(/,/g, '')) : 25000;
  return {
    origin: originMatch ? originMatch[1].trim() : 'Your starting point',
    destination: found?.id || 'ooty',
    destinationName,
    travellers: peopleMatch ? Math.min(12, Number(peopleMatch[1])) : 1,
    budget: Number.isFinite(budget) && budget > 0 ? budget : 25000,
    startDate: todayISO(),
    endDate: addDays(todayISO(), days - 1),
    preferences: [],
    tripType: /beach|relax/i.test(lower) ? 'Relaxation' : /culture|heritage/i.test(lower) ? 'Cultural' : /family|kids/i.test(lower) ? 'Family' : 'Nature',
    days,
  };
}

export default function Assistant() {
  const [text,setText] = useState('');
  const [messages, setMessages] = useState([{
    id: 'intro', role: 'assistant',
    text: 'Tell me where you want to go and for how long. I will put together a structured demo plan you can open in the planner. This assistant runs in clearly labelled demo mode — no live AI model is connected.',
  }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const navigate = useNavigate();
  const { saveTrip } = useTrips();

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);

  const send = async (raw) => {
    const value = (raw ?? text).trim();
    if (!value || busy) return;
    setText(''); setError(''); setBusy(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: value }]);
    try {
      const input = parseRequest(value);
      const plan = await generatePlan(input);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant',
        text: `Here is a ${input.days}-day demo plan for ${input.destinationName}${input.origin !== 'Your starting point' ? ` from ${input.origin}` : ''}. It is generated from the destination catalogue, not a live recommendation.`,
        plan: { ...plan, input },
      }]);
    } catch (e) {
      setError(e.message || 'The demo planner could not build that plan. Try a different destination.');
    } finally { setBusy(false); }
  };

  const savePlan = async (plan) => {
    const { input } = plan;
    const trip = {
      id: `trip-${Date.now()}`,
      name: `${input.days}-day demo plan · ${input.destinationName}`,
      origin: input.origin,
      destination: input.destination,
      destinationName: input.destinationName,
      startDate: input.startDate,
      endDate: input.endDate,
      travellers: input.travellers,
      budget: input.budget,
      preferences: input.preferences,
      tripType: input.tripType,
      itinerary: Array.isArray(plan.itinerary) ? plan.itinerary : [],
      expenses: [],
      status: 'planned',
      createdAt: new Date().toISOString(),
    };
    try {
      const saved = await saveTrip(trip);
      navigate(`/itinerary/${saved.id}`);
    } catch (e) { setError(e.message || 'Could not save this plan.'); }
  };

  return (
    <div className="container page assistant-page">
      <div className="stack" style={{ gap: 'var(--s2)', marginBottom: 'var(--s6)' }}>
        <span className="eyebrow">Demo mode · clearly labelled</span>
        <h1 className="page-title">AI Travel Assistant</h1>
        <p className="page-sub">Describe a trip in plain language. The assistant turns it into a day-wise starting point using the curated catalogue — then you can edit every part of it.</p>
      </div>

      <div className="assistant-layout">
        <Card className="chat-panel">
          <div className="chat-panel__head">
            <span className="chat-panel__avatar"><Bot size={20} aria-hidden="true" /></span>
            <div><strong>tripo planning assistant</strong><p className="dim" style={{ fontSize: 'var(--t1)' }}>Demo generator · no live model connected</p></div>
            <Badge tone="warning" className="chat-panel__badge">DEMO</Badge>
          </div>

          <div className="chat-log" role="log" aria-live="polite" aria-label="Conversation">
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
                <span className="chat-msg__avatar" aria-hidden="true">{m.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}</span>
                <div className="chat-msg__content">
                  <p>{m.text}</p>
                  {m.plan ? <PlanPreview plan={m.plan} onSave={() => savePlan(m.plan)} /> : null}
                </div>
              </div>
            ))}
            {busy ? <p className="chat-typing" role="status">Building a structured plan…</p> : null}
            {error ? <p className="inline-alert" role="alert"><AlertCircle size={15} aria-hidden="true" /> {error}</p> : null}
            <div ref={endRef} />
          </div>

          <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="chat-input">Describe your trip</label>
            <textarea id="chat-input" rows={2} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="e.g. I want to travel from Chennai to Ooty for 3 days with a budget of ₹8,000." />
            <Button type="submit" icon={Send} loading={busy} disabled={!text.trim()}>Send</Button>
          </form>
        </Card>

        <aside className="assistant-side stack">
          <Card className="stack">
            <h3>Try a prompt</h3>
            <p className="muted">Each suggestion is a starting point. Edit the text before sending if you like.</p>
            {suggestions.map((s) => <button key={s} type="button" className="prompt-suggestion" onClick={() => setText(s)}>{s}</button>)}
          </Card>
          <Card className="stack">
            <h3>How this works</h3>
            <ol className="assistant-how">
              <li><span>1</span> We read the destination, duration and budget from your message.</li>
              <li><span>2</span> A deterministic demo generator fills each day from real destination highlights.</li>
              <li><span>3</span> You save it as a trip and edit the itinerary and budget yourself.</li>
            </ol>
            <p className="dim" style={{ fontSize: 'var(--t1)' }}>No live AI or booking service is connected in this build.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PlanPreview({ plan, onSave }) {
  const budget = plan.budget || {};
  return (
    <div className="plan-preview stack">
      <div className="row row--between wrap">
        <Badge tone={plan.mode === 'demo' ? 'emerald' : 'warning'}>{plan.mode === 'demo' ? 'DEMO GENERATED' : 'LIVE RESPONSE'}</Badge>
        <Button size="sm" onClick={onSave}>Save as trip</Button>
      </div>
      {plan.summary ? <p className="muted">{plan.summary}</p> : null}
      <div className="plan-preview__days">
        {(plan.itinerary || []).map((day) => (
          <div key={day.id || day.day} className="plan-preview__day">
            <strong>Day {day.day}{day.date ? ` · ${day.date}` : ''}</strong>
            <ul>
              {(day.activities || []).map((a) => <li key={a.id || `${day.day}-${a.title}`}><span className="accent">{a.time}</span> {a.title}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {budget.total ? <p className="plan-preview__total">Indicative total: <strong>{inr(budget.total)}</strong></p> : null}
      {plan.suggestions?.length ? (
        <ul className="plan-preview__tips">{plan.suggestions.slice(0, 3).map((s) => <li key={s}>{s}</li>)}</ul>
      ) : null}
      <Link className="accent" to="/create-trip" style={{ fontSize: 'var(--t2)', fontWeight: 700 }}>Prefer to start from the planner? <Sparkles size={14} aria-hidden="true" /></Link>
    </div>
  );
}
