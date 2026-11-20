import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { destinoAposLogin } from '../services/filhos';
import { usePagina } from '../lib/usePagina';

export default function Index() {
  usePagina('Vale das Frutas');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Se já existir uma sessão ativa, pula direto para a área logada
  useEffect(() => {
    if (!user) return;
    let ativo = true;
    destinoAposLogin().then((destino) => { if (ativo) navigate(destino, { replace: true }); });
    return () => { ativo = false; };
  }, [user, navigate]);

  return (
    <div className="wrap">
      <img className="logo" src="/logo.png" alt="Vale das Frutas" />
      <div className="welcome-buttons">
        <Link className="btn btn-solid" to="/login">Entrar</Link>
        <Link className="btn btn-outline" to="/cadastro">Criar conta</Link>
      </div>
    </div>
  );
}
