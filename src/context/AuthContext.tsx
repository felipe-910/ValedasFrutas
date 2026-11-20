import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { watchAuthState } from '../services/auth';

interface AuthState {
  user: User | null;
  carregando: boolean; // true até o Firebase dizer se há alguém logado
}

const AuthContext = createContext<AuthState>({ user: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<AuthState>({ user: null, carregando: true });

  useEffect(() => {
    return watchAuthState((user) => setEstado({ user, carregando: false }));
  }, []);

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
