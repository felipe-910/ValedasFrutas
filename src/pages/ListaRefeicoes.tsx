import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import { useToast } from '../context/ToastContext';
import { CLASSE_TIPO } from '../lib/tiposRefeicao';
import { formatarData, formatarHora, intervaloDoPeriodo, rotuloDoPeriodo } from '../lib/tempo';
import type { PeriodoRefeicoes } from '../lib/tempo';
import { paraISO } from '../lib/idade';
import { guardarRefeicaoEmEdicao, limparRefeicaoEmEdicao } from '../lib/sessao';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import { sincronizarMetas, mensagemPerdas } from '../services/metas';
import { deleteRefeicao, listarRefeicoes } from '../services/refeicoes';
import type { CursorRefeicoes } from '../services/refeicoes';
import type { Refeicao, StatusRefeicao, TipoRefeicao } from '../types';

// Cada aba vira um filtro de tipo feito no Firestore (a lista é paginada, então não dá para filtrar no aparelho)
const FILTROS: Record<string, TipoRefeicao[] | null> = {
  'Todas': null,
  'Café da manhã': ['Café da manhã'],
  'Almoço': ['Almoço'],
  'Lanches': ['Lanche da manhã', 'Lanche da tarde'],
  'Janta': ['Janta']
};

const OPCOES_PERIODO: { rotulo: string; periodo: PeriodoRefeicoes }[] = [
  { rotulo: 'Hoje', periodo: { tipo: 'hoje' } },
  { rotulo: 'Essa semana', periodo: { tipo: 'semana' } },
  { rotulo: 'Semana passada', periodo: { tipo: 'semana_passada' } }
];

const STATUS: Record<StatusRefeicao, string> = { completa: 'Completa', metade: 'Pela metade', nao_comeu: 'Não comeu' };

export default function ListaRefeicoes() {
  usePagina('Refeições', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [filho] = useFilhoAtivo();

  const [filtro, setFiltro] = useState('Todas');
  const [periodo, setPeriodo] = useState<PeriodoRefeicoes | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregouUmaVez, setCarregouUmaVez] = useState(false);
  const cursor = useRef<CursorRefeicoes>(null);
  const pedido = useRef(0); // identifica a busca mais recente (ignora respostas de uma aba que já foi trocada)

  const filhoId = filho?.id;

  // Traz uma página de refeições. reiniciar = true começa de novo (primeira carga ou troca de aba).
  const carregar = useCallback(async (nomeFiltro: string, periodoEscolhido: PeriodoRefeicoes | null, reiniciar: boolean) => {
    if (!filhoId) return;
    const meu = ++pedido.current;
    if (reiniciar) {
      setRefeicoes([]);
      cursor.current = null;
      setTemMais(false);
      setCarregouUmaVez(false);
    }
    setCarregando(true);
    try {
      const pagina = await listarRefeicoes(filhoId, {
        tipos: FILTROS[nomeFiltro],
        periodo: periodoEscolhido ? intervaloDoPeriodo(periodoEscolhido) : null,
        cursor: cursor.current
      });
      if (meu !== pedido.current) return;
      setRefeicoes((atual) => (reiniciar ? pagina.itens : atual.concat(pagina.itens)));
      cursor.current = pagina.cursor;
      setTemMais(pagina.temMais);
      setCarregouUmaVez(true);
    } catch (err) {
      if (meu !== pedido.current) return;
      console.error(err);
      mostrarToast('Não foi possível carregar as refeições.');
      setCarregouUmaVez(true);
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
  }, [filhoId, mostrarToast]);

  useEffect(() => {
    void carregar(filtro, periodo, true);
  }, [filtro, periodo, carregar]);

  useTutorialDaTela('lista-refeicoes', carregouUmaVez); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  function escolherPeriodo(novo: PeriodoRefeicoes | null) {
    setPeriodo(novo);
    setPainelAberto(false);
  }

  const diaEscolhido = periodo?.tipo === 'dia' ? periodo.data : '';

  async function remover(refeicao: Refeicao) {
    if (!filho) return;
    if (!confirm('Remover essa refeição?')) return;
    try {
      await deleteRefeicao(refeicao.id);
      setRefeicoes((atual) => atual.filter((r) => r.id !== refeicao.id));
      mostrarToast('Refeição removida.');
      // apagar uma refeição pode tirar um dia de uma meta (ou reabri-la): recalcula já e avisa
      try {
        const { perdas } = await sincronizarMetas(filho.id, filho.nome);
        if (perdas.length) mostrarToast(`Refeição removida. ${mensagemPerdas(perdas)}`, 5000);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível remover a refeição.');
    }
  }

  function editar(refeicao: Refeicao) {
    guardarRefeicaoEmEdicao(refeicao);
    navigate('/refeicoes');
  }

  return (
    <>
      <BarraTopo titulo="Refeições" voltarPara="/crianca" />

      <div className="child-body">
        <div className="meal-filter-bar">
          <button
            className={`meal-filter-btn${periodo ? ' active' : ''}`}
            type="button"
            aria-label="Filtrar por data"
            aria-expanded={painelAberto}
            onClick={() => setPainelAberto((aberto) => !aberto)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 13h12v-2H6M3 6v2h18V6M10 18h4v-2h-4" />
            </svg>
          </button>
          {periodo && (
            <span className="meal-filter-chip">
              {rotuloDoPeriodo(periodo)}
              <button type="button" aria-label="Limpar filtro de data" onClick={() => escolherPeriodo(null)}>&times;</button>
            </span>
          )}
        </div>

        {painelAberto && (
          <div className="meal-filter-panel">
            <div className="meal-filter-options">
              {OPCOES_PERIODO.map((op) => (
                <button
                  key={op.rotulo}
                  className={`meal-filter-option${periodo?.tipo === op.periodo.tipo ? ' active' : ''}`}
                  type="button"
                  onClick={() => escolherPeriodo(op.periodo)}
                >
                  {op.rotulo}
                </button>
              ))}
            </div>
            <label className="meal-filter-date">
              <span>Buscar por dia</span>
              <input
                type="date"
                max={paraISO(new Date())}
                value={diaEscolhido}
                onChange={(e) => escolherPeriodo(e.target.value ? { tipo: 'dia', data: e.target.value } : null)}
              />
            </label>
            {periodo && (
              <button className="meal-filter-clear" type="button" onClick={() => escolherPeriodo(null)}>Limpar filtro</button>
            )}
          </div>
        )}

        <div className="meal-filter-tabs">
          {Object.keys(FILTROS).map((nome) => (
            <button key={nome} className={`meal-filter-tab${filtro === nome ? ' active' : ''}`} type="button" onClick={() => setFiltro(nome)}>
              {nome}
            </button>
          ))}
        </div>

        <div>
          {refeicoes.map((refeicao) => {
            const classe = CLASSE_TIPO[refeicao.tipo] || CLASSE_TIPO['Almoço'];
            const descricao = (refeicao.alimentos || []).map((a) => a.nome).join(', ');
            const data = refeicao.criadoEm ? formatarData(refeicao.criadoEm) : '—';
            const hora = formatarHora(refeicao.criadoEm);
            return (
              <div className="meal-card" key={refeicao.id}>
                {/* mesma caixa (cores e ícone) da tela de registrar refeição */}
                <div className={`meal-card-icon ${classe}`}>
                  <span className="meal-ico" aria-hidden="true" />
                  <span>{refeicao.tipo}</span>
                </div>
                <div className="meal-card-info">
                  <p className="meal-card-title">{refeicao.tipo}</p>
                  <p className="meal-card-desc">{descricao || '—'}</p>
                  {refeicao.status && STATUS[refeicao.status] && <p className="meal-card-status">{STATUS[refeicao.status]}</p>}
                </div>
                <div className="meal-card-side">
                  <span className="meal-card-datetime">{data}<br />- {hora}</span>
                  <div className="meal-card-actions">
                    <button className="icon-action edit" type="button" aria-label="Editar" onClick={() => editar(refeicao)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                    </button>
                    <button className="icon-action delete" type="button" aria-label="Remover" onClick={() => remover(refeicao)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M6 4V2.5H10V4M4.5 4L5 14H11L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="empty-note meals-empty" style={{ display: carregouUmaVez && !refeicoes.length && !temMais ? 'block' : 'none' }}>{periodo ? 'Nenhuma refeição nesse período.' : 'Nenhuma refeição registrada ainda.'}</p>
        {temMais && (
          <button className="load-more-btn" type="button" disabled={carregando} onClick={() => carregar(filtro, periodo, false)}>
            {carregando ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}

        <button className="cta" type="button" onClick={() => { limparRefeicaoEmEdicao(); navigate('/refeicoes'); }}>+ Registrar refeição</button>
      </div>
    </>
  );
}
