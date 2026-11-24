import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, Input, Badge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { isLiveApi } from '../lib/api';
import '../styles/pages-main.css';

const initial = { name: '', email: '', password: '' };

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const setField = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (mode === 'register' && values.name.trim().length < 2) next.name = 'Enter your name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (values.password.length < (mode === 'register' ? 8 : 1)) next.password = mode === 'register' ? 'Use at least 8 characters.' : 'Enter your password.';
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true); setServerError('');
    try {
      if (mode === 'register') await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      else await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from || '/profile');
    } catch (err) {
      setServerError(err.message || 'Could not complete that request. Try again.');
    } finally { setBusy(false); }
  };

  if (user) {
    return (
      <div className="container auth-wrap">
        <Card className="auth-card stack">
          <Badge tone="emerald">Signed in</Badge>
          <h1>You’re already here, {user.name?.split(' ')[0] || 'traveller'}.</h1>
          <p className="muted">Continue to your profile or head straight back to planning.</p>
          <div className="row wrap">
            <Button as={Link} to="/profile" iconRight={ArrowRight}>Go to profile</Button>
            <Button as={Link} to="/create-trip" variant="secondary">Plan a trip</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container auth-wrap">
      <Card className="auth-card stack">
        <div className="stack" style={{ gap: 'var(--s2)' }}>
          <span className="eyebrow">Welcome to tripo.tech</span>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
          <p className="muted">{mode === 'login' ? 'Sign in to keep your plans and wishlist close.' : 'Save trips across sessions and keep a profile of your journeys.'}</p>
        </div>

        <div className="auth-tabs" role="group" aria-label="Authentication mode">
          <button type="button" aria-pressed={mode === 'login'} className="auth-tab" onClick={() => { setMode('login'); setErrors({}); setServerError(''); }}>Login</button>
          <button type="button" aria-pressed={mode === 'register'} className="auth-tab" onClick={() => { setMode('register'); setErrors({}); setServerError(''); }}>Register</button>
        </div>

        {!isLiveApi() ? (
          <p className="inline-alert" style={{ margin: 0 }}><ShieldCheck size={16} aria-hidden="true" /> Demo mode: accounts are stored in this browser only. Do not use a real password.</p>
        ) : null}

        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === 'register' ? (
            <Field label="Full name" htmlFor="auth-name" required error={errors.name}>
              <Input id="auth-name" name="name" autoComplete="name" value={values.name} onChange={setField('name')} invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} placeholder="Your name" />
            </Field>
          ) : null}
          <Field label="Email address" htmlFor="auth-email" required error={errors.email}>
            <Input id="auth-email" name="email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={setField('email')} invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} placeholder="you@example.com" />
          </Field>
          <Field label="Password" htmlFor="auth-password" required error={errors.password} hint={mode === 'register' ? 'At least 8 characters. Demo mode — do not reuse a real password.' : undefined}>
            <Input id="auth-password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={values.password} onChange={setField('password')} invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'auth-password-error' : mode === 'register' ? 'auth-password-hint' : undefined} placeholder="••••••••" />
          </Field>

          {serverError ? <p className="inline-alert" role="alert"><AlertCircle size={15} aria-hidden="true" /> {serverError}</p> : null}
          <Button type="submit" size="lg" full loading={busy} icon={LockKeyhole} iconRight={ArrowRight}>
            {mode === 'login' ? 'Login' : 'Create account'}
          </Button>
        </form>

        <ul className="auth-notes">
          <li><Check size={15} aria-hidden="true" /> Your trips and wishlist remain available in demo mode even without an account.</li>
          <li><Check size={15} aria-hidden="true" /> Nothing here performs a booking or stores payment details.</li>
        </ul>
      </Card>
    </div>
  );
}
