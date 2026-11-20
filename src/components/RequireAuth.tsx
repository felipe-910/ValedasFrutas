import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

// Protege uma tela: só quem está logado vê. Enquanto o Firebase confere a sessão, não mostra nada.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, carregando } = useAuth();
  if (carregando) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
