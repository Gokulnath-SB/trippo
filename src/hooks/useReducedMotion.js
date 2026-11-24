import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return Boolean(window.matchMedia(QUERY).matches);
}

/**
 * Boolean hook for the user's reduced-motion preference.
 * Safe in SSR / non-browser environments; listener is always removed on cleanup.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const query = window.matchMedia(QUERY);
    const onChange = (event) => setReduced(Boolean(event.matches));

    // Re-sync in case the environment changed between render and effect.
    if (query.matches !== reduced) setReduced(query.matches);

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    // Legacy Safari fallback.
    if (typeof query.addListener === 'function') {
      query.addListener(onChange);
      return () => query.removeListener(onChange);
    }

    return undefined;
  }, [reduced]);

  return reduced;
}
