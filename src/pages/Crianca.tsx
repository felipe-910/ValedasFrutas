import { Navigate, useNavigate } from 'react-router-dom';
import Icone from '../components/Icone';
import PerfilMini from '../components/PerfilMini';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';

const ITENS = [
  { rota: '/painel', icone: 'mdi:view-dashboard', rotulo: 'Painel de acompanhamento' },
  { rota: '/desempenho', icone: 'mdi:chart-line', rotulo: 'Desempenho' },
  { rota: '/lista-refeicoes', icone: 'mdi:silverware-fork-knife', rotulo: 'Registrar refeições' },
  { rota: '/metas', icone: 'mdi:trophy', rotulo: 'Metas' },
  { rota: '/configuracoes', icone: 'mdi:cog', rotulo: 'Configurações' }
];

export default function Crianca() {
  usePagina('Painel', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const [filho] = useFilhoAtivo();

  if (!filho) return <Navigate to="/home" replace />;

  return (
    <>
      <button className="drag-topbar" type="button" aria-label="Voltar para a home" onClick={() => navigate('/home')}>
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
          <path d="M2 2L11 12L20 2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="child-body">
        <PerfilMini filho={filho} mostrarIdade mostrarNivel />

        <div className="menu-list">
          {ITENS.map((item) => (
            <button key={item.rota} className="menu-btn" type="button" data-tutorial={item.rota.slice(1)} onClick={() => navigate(item.rota)}>
              <span className="menu-icon"><Icone nome={item.icone} cor="9bc7a0" /></span>
              <span className="label">{item.rotulo}</span>
              <span className="chevron">&#8250;</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
