import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type MostrarToast = (mensagem: string, ms?: number) => void;

const ToastContext = createContext<MostrarToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState('');
  const [visivel, setVisivel] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const mostrar = useCallback<MostrarToast>((msg, ms = 2200) => {
    setMensagem(msg);
    setVisivel(true);
    window.clearTimeout(timer.current); // um aviso novo não é cortado pelo timer do anterior
    timer.current = window.setTimeout(() => setVisivel(false), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className={`toast${visivel ? ' show' : ''}`}>{mensagem}</div>
    </ToastContext.Provider>
  );
}

export function useToast(): MostrarToast {
  return useContext(ToastContext);
}
