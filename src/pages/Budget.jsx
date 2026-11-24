import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BedDouble, Check, Compass, Ellipsis, Info, Pencil, Plane, Plus,
  ShoppingBag, Ticket, Trash2, Utensils, Wallet,
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, Progress, Select, Spinner, Stat,
} from '../components/ui';
import {
  destinations, getDestination, searchDestinations, categories, countries, cities, categoryLabel, photo,
} from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../lib/auth';
import { isLiveApi } from '../lib/api';
import '../styles/trip-pages.css';

const EXPENSE_CATEGORIES = [
  { id: 'transportation', label: 'Transportation', icon: Plane, color: 'var(--emerald)' },
  { id: 'accommodation', label: 'Accommodation', icon: BedDouble, color: 'var(--emerald-bright)' },
  { id: 'food', label: 'Food', icon: Utensils, color: 'var(--emerald-soft)' },
  { id: 'activities', label: 'Activities', icon: Ticket, color: 'var(--warning)' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'var(--danger)' },
  { id: 'other', label: 'Other', icon: Ellipsis, color: 'var(--text-dim)' },
];

const makeId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});
const compactINR = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
});

const errorNode = (id, message) => (message ? <span id={id}>{message}</span> : undefined);

export default function Budget() {
  const { id } = useParams();
  const { user } = useAuth();
  const { trips, saveTrip, loading: tripsLoading } = useTrips();
  const trip = useMemo(() => trips.find((item) => item.id === id), [trips, id]);

  const [expenses, setExpenses] = useState([]);
  const dirtyRef = useRef(false);
  const [editing, setEditing] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trip || dirtyRef.current) return;
    setExpenses(Array.isArray(trip.expenses) ? trip.expenses : []);
  }, [trip]);

  if (tripsLoading) {
    return <div className="page container tp-page"><Spinner label="Loading budget" /></div>;
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

  const budget = Number(trip.budget) || 0;
  const total = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const estimatedTotal = expenses
    .filter((expense) => expense.estimated)
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const actualTotal = total - estimatedTotal;
  const remaining = budget - total;
  const usedPercent = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const tone = remaining < 0 ? 'danger' : usedPercent >= 80 ? 'warning' : 'emerald';

  // Plain derived value: no hook after the early returns above (stable hook order).
  const byCategory = expenses.reduce((acc, expense) => {
    const key = EXPENSE_CATEGORIES.some((c) => c.id === expense.category) ? expense.category : 'other';
    acc[key] = (acc[key] || 0) + (Number(expense.amount) || 0);
    return acc;
  }, {});

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;
  const segments = EXPENSE_CATEGORIES.map((category) => {
    const value = byCategory[category.id] || 0;
    const length = total > 0 ? (value / total) * circumference : 0;
    const segment = { ...category, value, length, offset: runningOffset };
    runningOffset += length;
    return segment;
  });

  const mutateExpenses = (updater) => {
    dirtyRef.current = true;
    setMessage('');
    setSaveError('');
    setExpenses((prev) => updater(prev));
  };

  const startAdd = () => {
    setFormErrors({});
    setEditing({ id: null, values: { category: 'food', title: '', amount: '', estimated: true, date: '' } });
  };

  const startEdit = (expense) => {
    setFormErrors({});
    setEditing({
      id: expense.id,
      values: {
        category: expense.category || 'other',
        title: expense.title || '',
        amount: String(expense.amount ?? ''),
        estimated: Boolean(expense.estimated),
        date: expense.date || '',
      },
    });
  };

  const updateEditing = (key, value) => {
    setEditing((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveExpense = () => {
    if (!editing) return;
    const values = editing.values;
    const found = {};
    if (!values.title.trim()) found.title = 'Add a title for this expense.';
    const amount = Number(values.amount);
    if (!values.amount || !Number.isFinite(amount) || amount <= 0) found.amount = 'Enter an amount in INR greater than zero.';
    if (Object.keys(found).length > 0) {
      setFormErrors(found);
      document.getElementById('tp-expense-title')?.focus();
      return;
    }
    const expense = {
      id: editing.id || makeId(),
      category: values.category,
      title: values.title.trim(),
      amount,
      estimated: Boolean(values.estimated),
      date: values.date || '',
    };
    const editingId = editing.id;
    mutateExpenses((prev) => (editingId
      ? prev.map((item) => (item.id === editingId ? expense : item))
      : [expense, ...prev]));
    setEditing(null);
  };

  const removeExpense = (expenseId) => {
    mutateExpenses((prev) => prev.filter((item) => item.id !== expenseId));
  };

  const handleSave = async () => {
    if (isLiveApi() && !user) {
      setSaveError('Sign in to save this budget to your account.');
      return;
    }
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      const saved = await saveTrip({ ...trip, expenses });
      dirtyRef.current = false;
      setExpenses(Array.isArray(saved?.expenses) ? saved.expenses : expenses);
      setMessage('Budget saved.');
    } catch {
      setSaveError('We could not save this budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categoryMeta = (categoryId) => EXPENSE_CATEGORIES.find((c) => c.id === categoryId) || EXPENSE_CATEGORIES[5];

  return (
    <div className="page container tp-page">
      <nav aria-label="Breadcrumb" className="tp-meta-list" style={{ marginBottom: 'var(--s4)' }}>
        <Link className="muted" to="/my-trips">My trips</Link>
        <span aria-hidden="true">/</span>
        <span>{trip.name}</span>
      </nav>

      <header className="tp-page-head">
        <div className="tp-page-head__text">
          <span className="eyebrow">Budget</span>
          <h1 className="page-title">{trip.name}</h1>
          <p className="muted">Track planned and actual spend in INR. All amounts are entered by you — nothing here is a live price.</p>
        </div>
        <div className="tp-summary-bar__actions">
          <Button as={Link} to={`/itinerary/${trip.id}`} variant="secondary" icon={ArrowLeft}>Itinerary</Button>
          <Button as={Link} to={`/map/${trip.id}`} variant="secondary" icon={Compass}>Map</Button>
        </div>
      </header>

      {!user ? (
        <p className="tp-notice" role="status" style={{ marginBottom: 'var(--s5)' }}>
          <Info size={16} aria-hidden="true" />
          Demo mode: your budget saves in this browser. <Link to="/auth">Sign in</Link> to keep it with an account.
        </p>
      ) : null}

      <div className="tp-metric-row" style={{ marginBottom: 'var(--s5)' }}>
        <Card><Stat label="Planned budget (INR)" value={inr.format(budget)} hint="Set when the trip was created" /></Card>
        <Card><Stat label="Recorded spend (INR)" value={inr.format(total)} hint={`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`} tone /></Card>
        <Card><Stat label="Estimated (INR)" value={inr.format(estimatedTotal)} hint="Marked as estimates" /></Card>
        <Card>
          <Stat
            label={remaining < 0 ? 'Over budget (INR)' : 'Remaining (INR)'}
            value={inr.format(Math.abs(remaining))}
            hint={remaining < 0 ? 'Reduce spend or raise the budget' : 'Available for the rest of the trip'}
            tone={remaining >= 0}
          />
        </Card>
      </div>

      <Card style={{ marginBottom: 'var(--s5)' }}>
        <div className="row row--between wrap" style={{ marginBottom: 'var(--s3)' }}>
          <strong style={{ fontSize: 'var(--t2)' }}>Budget used</strong>
          <span className="muted" style={{ fontSize: 'var(--t1)' }}>
            {inr.format(total)} of {inr.format(budget)} INR · {Math.round(usedPercent)}%
          </span>
        </div>
        <Progress value={total} max={budget || 1} tone={tone} label="Budget used" />
        <p className="tp-fact__note" style={{ marginTop: 'var(--s3)' }}>
          Actual spend {inr.format(actualTotal)} · Estimated spend {inr.format(estimatedTotal)}. All figures in INR.
        </p>
      </Card>

      <div className="tp-budget-grid">
        <section aria-labelledby="tp-expenses-title">
          <div className="section-head" style={{ marginBottom: 'var(--s4)' }}>
            <div className="stack" style={{ gap: 'var(--s2)' }}>
              <h2 id="tp-expenses-title" style={{ fontSize: 'var(--t4)' }}>Expenses</h2>
              <p className="muted" style={{ fontSize: 'var(--t2)' }}>Estimated and actual entries are tracked separately in the totals above.</p>
            </div>
            <div className="tp-summary-bar__actions">
              <Button icon={Plus} onClick={startAdd} disabled={!user}>Add expense</Button>
              <Button icon={Check} onClick={handleSave} loading={saving} disabled={!user}>
                {saving ? 'Saving…' : 'Save budget'}
              </Button>
            </div>
          </div>

          <p className="tp-live" role="status" aria-live="polite">{message}</p>
          {saveError ? <p className="tp-notice tp-notice--error" role="alert" style={{ marginTop: 'var(--s2)' }}>{saveError}</p> : null}

          {expenses.length === 0 ? (
            <div style={{ marginTop: 'var(--s4)' }}>
              <EmptyState
                icon={Wallet}
                title="No expenses yet"
                description="Add a transportation, stay, food or activity expense to see your budget breakdown."
                action={<Button icon={Plus} onClick={startAdd} disabled={!user}>Add first expense</Button>}
              />
            </div>
          ) : (
            <ul className="tp-expense-list" style={{ marginTop: 'var(--s4)' }}>
              {expenses.map((expense) => {
                const meta = categoryMeta(expense.category);
                const CategoryIcon = meta.icon;
                return (
                  <li className="tp-expense" key={expense.id}>
                    <div className="tp-expense__main">
                      <span className="tp-expense__icon"><CategoryIcon size={18} aria-hidden="true" /></span>
                      <div>
                        <p className="tp-expense__title">{expense.title}</p>
                        <p className="tp-fact__label">{meta.label}{expense.date ? ` · ${expense.date}` : ''}</p>
                      </div>
                      {expense.estimated ? <Badge tone="warning">Estimated</Badge> : <Badge tone="emerald">Actual</Badge>}
                    </div>
                    <div className="row">
                      <span className="tp-expense__amount">{inr.format(Number(expense.amount))}</span>
                      <div className="tp-expense__tools">
                        <IconButton label={`Edit ${expense.title}`} icon={Pencil} onClick={() => startEdit(expense)} disabled={!user} />
                        <IconButton label={`Delete ${expense.title}`} icon={Trash2} onClick={() => removeExpense(expense.id)} disabled={!user} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-label="Spend breakdown">
          <Card className="tp-donut-wrap">
            <h3 style={{ fontSize: 'var(--t4)' }}>Spend by category</h3>
            <svg className="tp-donut" viewBox="0 0 140 140" role="img" aria-label="Donut chart of recorded spend by category, in INR">
              <circle className="tp-donut__track" cx="70" cy="70" r={radius} strokeWidth="16" />
              {segments.filter((segment) => segment.length > 0).map((segment) => (
                <circle
                  key={segment.id}
                  className="tp-donut__seg"
                  cx="70" cy="70" r={radius} strokeWidth="16"
                  strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  transform="rotate(-90 70 70)"
                  style={{ stroke: segment.color }}
                />
              ))}
              <text className="tp-donut__center" x="70" y="70">{compactINR.format(total)}</text>
              <text className="tp-donut__center-label" x="70" y="88">TOTAL INR</text>
            </svg>
            <ul className="tp-legend">
              {segments.map((segment) => (
                <li className="tp-legend__row" key={segment.id}>
                  <span className="tp-legend__swatch" style={{ background: segment.color }} aria-hidden="true" />
                  <span>{segment.label}</span>
                  <span className="tp-legend__amount">{inr.format(segment.value)}</span>
                </li>
              ))}
            </ul>
            {total === 0 ? <p className="tp-fact__note">No recorded spend yet — add an expense to populate the chart.</p> : null}
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit expense' : 'Add expense'}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button icon={Check} onClick={saveExpense}>{editing?.id ? 'Update expense' : 'Add expense'}</Button>
          </>
        )}
      >
        <div className="tp-modal-stack">
          <Field label="Category" required htmlFor="tp-expense-category"
            error={errorNode('tp-expense-category-error', formErrors.category)}>
            <Select id="tp-expense-category" value={editing?.values.category || 'food'}
              onChange={(e) => updateEditing('category', e.target.value)}
              invalid={Boolean(formErrors.category)}
              aria-describedby={formErrors.category ? 'tp-expense-category-error' : undefined}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title" required htmlFor="tp-expense-title"
            error={errorNode('tp-expense-title-error', formErrors.title)}>
            <Input id="tp-expense-title" value={editing?.values.title || ''} placeholder="e.g. Train to Jaipur"
              onChange={(e) => updateEditing('title', e.target.value)}
              invalid={Boolean(formErrors.title)}
              aria-describedby={formErrors.title ? 'tp-expense-title-error' : undefined} />
          </Field>
          <Field label="Amount (INR)" required htmlFor="tp-expense-amount"
            error={errorNode('tp-expense-amount-error', formErrors.amount)}>
            <Input id="tp-expense-amount" type="number" min="1" step="1" inputMode="numeric"
              value={editing?.values.amount ?? ''} placeholder="1500"
              onChange={(e) => updateEditing('amount', e.target.value)}
              invalid={Boolean(formErrors.amount)}
              aria-describedby={formErrors.amount ? 'tp-expense-amount-error' : undefined} />
          </Field>
          <Field label="Date" htmlFor="tp-expense-date" hint="Optional — leave blank if the date is not decided.">
            <Input id="tp-expense-date" type="date" value={editing?.values.date || ''}
              onChange={(e) => updateEditing('date', e.target.value)} />
          </Field>
          <label className="tp-checkbox" htmlFor="tp-expense-estimated">
            <input id="tp-expense-estimated" type="checkbox" checked={Boolean(editing?.values.estimated)}
              onChange={(e) => updateEditing('estimated', e.target.checked)} />
            This is an estimated amount
          </label>
          <p className="tp-fact__note"><Info size={14} aria-hidden="true" /> Inline edits stay in a draft until you choose “Save budget”.</p>
        </div>
      </Modal>
    </div>
  );
}
