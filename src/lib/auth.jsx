import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './api.js';
import { STORAGE_KEYS, getJSON, removeJSON, setJSON } from './storage.js';

const AuthContext = createContext(null);

function readStoredSession() {
  const token = getJSON(STORAGE_KEYS.token, null);
  const user = getJSON(STORAGE_KEYS.user, null);
  return {
    token: typeof token === 'string' && token ? token : null,
    user: user && typeof user === 'object' && !Array.isArray(user) ? user : null,
  };
}

function clearStoredSession() {
  removeJSON(STORAGE_KEYS.token);
  removeJSON(STORAGE_KEYS.user);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const stored = readStoredSession();

    if (!stored.token) {
      setLoading(false);
      return () => { active = false; };
    }

    // Backend may be offline; a failed refresh simply clears the stale session.
    authApi.me()
      .then((user) => {
        if (!active) return;
        const next = { token: stored.token, user };
        setSession(next);
        setJSON(STORAGE_KEYS.user, user);
      })
      .catch(() => {
        if (!active) return;
        clearStoredSession();
        setSession({ token: null, user: null });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const login = useCallback(async (values) => {
    setLoading(true);
    try {
      const result = await authApi.login(values);
      if (!result?.token) throw new Error('Sign-in did not return a session token.');
      const next = { token: result.token, user: result.user ?? null };
      setJSON(STORAGE_KEYS.token, next.token);
      setJSON(STORAGE_KEYS.user, next.user);
      setSession(next);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (values) => {
    setLoading(true);
    try {
      const result = await authApi.register(values);
      if (!result?.token) throw new Error('Sign-up did not return a session token.');
      const next = { token: result.token, user: result.user ?? null };
      setJSON(STORAGE_KEYS.token, next.token);
      setJSON(STORAGE_KEYS.user, next.user);
      setSession(next);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Sign-out must always clear local state, even if the API is unreachable.
    } finally {
      clearStoredSession();
      setSession({ token: null, user: null });
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user: session.user,
    token: session.token,
    loading,
    login,
    register,
    logout,
  }), [session, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
