import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PublicUser } from '@autotests-simulator/domain';
import { api } from '../lib/api';

type SessionValue = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<PublicUser>;
  signup: (name: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ user: PublicUser | null }>('/api/me');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener('kotes:session-changed', handler);
    return () => window.removeEventListener('kotes:session-changed', handler);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: PublicUser }>('/api/auth/login', { email, password });
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ user: PublicUser }>('/api/auth/signup', {
      name,
      email,
      password,
    });
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, loading, refresh, login, signup, logout }),
    [user, loading, refresh, login, signup, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
