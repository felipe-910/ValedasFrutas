import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CHAVE_MODO_CRIANCA } from '../services/modoCrianca';

// Enquanto o modo criança estiver ativo (veja services/modoCrianca.ts), as telas da área dos pais não abrem:
// quem tentar entrar nelas (botão voltar, endereço digitado, aba reaberta) volta para a tela de histórias.
// Só a senha dos pais desliga o modo, pelo menu da própria tela de histórias.
const LIVRES = ['/historias', '/login', '/cadastro', '/', '/recuperar-senha', '/redefinir-senha', '/redefinir-senha.html'];

export default function ModoCriancaGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function checar() {
      let ativo: string | null = null;
      try { ativo = localStorage.getItem(CHAVE_MODO_CRIANCA); } catch { /* sem acesso ao armazenamento */ }
      if (!ativo) return;
      if (!LIVRES.includes(pathname)) navigate('/historias', { replace: true });
    }
    checar();
    // voltar pelo histórico pode mostrar a página guardada pelo navegador, sem rodar os scripts de novo
    const aoMostrar = (e: PageTransitionEvent) => { if (e.persisted) checar(); };
    window.addEventListener('pageshow', aoMostrar);
    return () => window.removeEventListener('pageshow', aoMostrar);
  }, [pathname, navigate]);

  return <>{children}</>;
}
