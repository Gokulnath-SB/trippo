import React, { forwardRef, useRef } from 'react';
import { AlertCircle, Loader2, Inbox, X } from 'lucide-react';
import '../styles/ui.css';

/**
 * Shared primitives for every tripo.tech screen.
 * All values come from src/styles/tokens.css — do not hard-code colours or sizes here.
 */

export function Button({
  variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight,
  loading = false, full = false, as: Comp = 'button', children, className = '',
  disabled, ...props
}) {
  return (
    <Comp
      className={`ui-btn ui-btn--${variant} ui-btn--${size}${full ? ' ui-btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 size={17} className="ui-spin" aria-hidden="true" /> : Icon ? <Icon size={17} aria-hidden="true" /> : null}
      {children ? <span>{children}</span> : null}
      {IconRight ? <IconRight size={17} aria-hidden="true" /> : null}
    </Comp>
  );
}

export function IconButton({ label, icon: Icon, size = 'md', className = '', ...props }) {
  return (
    <button type="button" className={`ui-icon-btn ui-icon-btn--${size} ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />
    </button>
  );
}

export function Card({ children, className = '', interactive = false, as: Comp = 'div', ...props }) {
  return <Comp className={`ui-card${interactive ? ' ui-card--interactive' : ''} ${className}`} {...props}>{children}</Comp>;
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-head">
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p className="lead">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const Field = forwardRef(function Field(
  { label, hint, error, required, htmlFor, children, className = '', ...props }, ref
) {
  return (
    <div className={`ui-field ${className}`} ref={ref} {...props}>
      {label ? <label className="ui-field__label" htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label> : null}
      {children}
      {error ? <p id={htmlFor ? `${htmlFor}-error` : undefined} className="ui-field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{error}</p> : hint ? <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="ui-field__hint">{hint}</p> : null}
    </div>
  );
});

export const Input = forwardRef(function Input({ invalid, className = '', ...props }, ref) {
  return <input ref={ref} className={`ui-input${invalid ? ' ui-input--invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...props} />;
});

export const Select = forwardRef(function Select({ invalid, className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`ui-input ui-select${invalid ? ' ui-input--invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className = '', ...props }, ref) {
  return <textarea ref={ref} className={`ui-input ui-textarea${invalid ? ' ui-input--invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...props} />;
});

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`}>{children}</span>;
}

export function Chip({ active = false, icon: Icon, children, className = '', ...props }) {
  return (
    <button type="button" aria-pressed={active} className={`ui-chip${active ? ' ui-chip--active' : ''} ${className}`} {...props}>
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}{children}
    </button>
  );
}

export function Spinner({ label = 'Loading' }) {
  return <span className="ui-spinner-wrap" role="status"><Loader2 className="ui-spin" size={22} aria-hidden="true" /><span className="sr-only">{label}</span></span>;
}

export function Skeleton({ width = '100%', height = 16, circle = false, className = '' }) {
  return <span className={`ui-skeleton${circle ? ' ui-skeleton--circle' : ''} ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, as: Heading = 'h3', className = '' }) {
  return (
    <div className={`ui-state ${className}`}>
      <span className="ui-state__icon"><Icon size={26} aria-hidden="true" /></span>
      <Heading>{title}</Heading>
      {description ? <p className="muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, action }) {
  return (
    <div className="ui-state" role="alert">
      <span className="ui-state__icon ui-state__icon--error"><AlertCircle size={26} aria-hidden="true" /></span>
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function Progress({ value = 0, max = 100, tone = 'emerald', label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="ui-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
      <span className={`ui-progress__fill ui-progress__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, labelledBy = 'modal-title' }) {
  const dialogRef = useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusable = () => Array.from(
      dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((el) => el.offsetParent !== null);

    // Move focus in, keep Tab inside, and restore focus to the trigger on close.
    focusable()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ui-modal__backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="ui-modal__head">
          <h3 id={labelledBy}>{title}</h3>
          <IconButton label="Close dialog" icon={X} onClick={onClose} />
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat__label">{label}</span>
      <span className={`ui-stat__value${tone ? ` accent` : ''}`}>{value}</span>
      {hint ? <span className="ui-stat__hint">{hint}</span> : null}
    </div>
  );
}
