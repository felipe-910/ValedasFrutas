import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import PerfilMini from '../components/PerfilMini';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import DetalhePartida, { NarradorPartida } from '../components/DetalhePartida';
import { formatarData, formatarHora, intervaloDoPeriodo, paraData, paraMillis, rotuloDoPeriodo } from '../lib/tempo';
import type { PeriodoRefeicoes } from '../lib/tempo';
import { paraISO } from '../lib/idade';
import { codigoDoErro } from '../services/erros';
import { listarPartidas } from '../services/partidas';
import type { IdJogo, Partida } from '../types';

type Ordem = 'recentes' | 'antigas' | 'az' | 'za';

const ORDENS: Array<{ id: Ordem; rotulo: string; texto: string }> = [
  { id: 'recentes', rotulo: 'Mais recentes primeiro', texto: '\u2193' },
  { id: 'antigas', rotulo: 'Mais antigas primeiro', texto: '\u2191' },
  { id: 'az', rotulo: 'Jogos de A a Z', texto: 'A' },
  { id: 'za', rotulo: 'Jogos de Z a A', texto: 'Z' }
];

const SUBTITULOS: Record<Ordem, string> = {
  recentes: 'Mais recentes',
  antigas: 'Mais antigas',
  az: 'Por jogo (A a Z)',
  za: 'Por jogo (Z a A)'
};

// Os mesmos filtros da tela de refeições: abas (aqui, por jogo) + período
const ABAS: Array<{ id: IdJogo | null; rotulo: string }> = [
  { id: null, rotulo: 'Todos' },
  { id: 'cesta', rotulo: 'Cesta' },
  { id: 'semaforo', rotulo: 'Semáforo' },
  { id: 'prato', rotulo: 'Prato' }
];

const OPCOES_PERIODO: { rotulo: string; periodo: PeriodoRefeicoes }[] = [
  { rotulo: 'Hoje', periodo: { tipo: 'hoje' } },
  { rotulo: 'Essa semana', periodo: { tipo: 'semana' } },
  { rotulo: 'Semana passada', periodo: { tipo: 'semana_passada' } }
];

// Cor de fundo de cada jogo (a mesma dos cartões da tela de histórias)
const FUNDOS: Record<string, string> = { prato: '#ffeccb', semaforo: '#dcf3e0', cesta: '#d9f0fb' };

function Estrelas({ n }: { n: number }) {
  return (
    <span className="perf-estrelas" role="img" aria-label={`${n} de 3 estrelas`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'cheia' : ''}>★</span>)}
    </span>
  );
}

export default function Desempenho() {
  usePagina('Desempenho', 'home-page', '#6fa981');
  const [filho] = useFilhoAtivo();
  const [ordem, setOrdem] = useState<Ordem>('recentes');
  const [partidas, setPartidas] = useState<Partida[] | null>(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<IdJogo | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoRefeicoes | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);

  const filhoId = filho?.id;
  useEffect(() => {
    if (!filhoId) return;
    let ativo = true;
    listarPartidas(filhoId)
      .then((lista) => { if (ativo) setPartidas(lista); })
      .catch((err) => {
        console.error('Falha ao carregar o desempenho:', err);
        if (ativo) {
          // permission-denied = as regras publicadas no Firebase ainda não têm a coleção "partidas"
          setErro(codigoDoErro(err) === 'permission-denied'
            ? 'O Firebase recusou o acesso às partidas. Publique o arquivo firestore.rules no Console do Firebase.'
            : 'Não foi possível carregar o desempenho agora.');
          setPartidas([]);
        }
      });
    return () => { ativo = false; };
  }, [filhoId]);

  const ordenadas = useMemo(() => {
    // partida recém-salva ainda pode estar sem a data do servidor: é a mais nova
    const quando = (p: Partida) => (p.criadoEm ? paraMillis(p.criadoEm) : Number.MAX_SAFE_INTEGER);
    const intervalo = periodo ? intervaloDoPeriodo(periodo) : null;
    const lista = (partidas ?? []).filter((p) => {
      if (aba && p.jogo !== aba) return false;
      if (!intervalo) return true;
      const d = paraData(p.criadoEm) ?? new Date(); // recém-salva: é de agora
      return d >= intervalo.inicio && d < intervalo.fim;
    });
    const porNome = (a: Partida, b: Partida) => (a.jogoNome || '').localeCompare(b.jogoNome || '', 'pt-BR') || quando(b) - quando(a);
    if (ordem === 'recentes') return lista.sort((a, b) => quando(b) - quando(a));
    if (ordem === 'antigas') return lista.sort((a, b) => quando(a) - quando(b));
    if (ordem === 'az') return lista.sort(porNome);
    return lista.sort((a, b) => -porNome(a, b) || quando(b) - quando(a));
  }, [partidas, ordem, aba, periodo]);

  function escolherPeriodo(novo: PeriodoRefeicoes | null) {
    setPeriodo(novo);
    setPainelAberto(false);
  }
  const diaEscolhido = periodo?.tipo === 'dia' ? periodo.data : '';

  useTutorialDaTela('desempenho', partidas !== null); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  return (
    <>
      <BarraTopo titulo="Desempenho" voltarPara="/crianca" />

      <div className="child-body perf-pagina">
        <PerfilMini filho={filho} mostrarNivel />

        <div className="meal-filter-bar">
          <button className={`meal-filter-btn${periodo ? ' active' : ''}`} type="button" aria-label="Filtrar por data" aria-expanded={painelAberto} onClick={() => setPainelAberto((aberto) => !aberto)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 13h12v-2H6M3 6v2h18V6M10 18h4v-2h-4" /></svg>
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
                <button key={op.rotulo} className={`meal-filter-option${periodo?.tipo === op.periodo.tipo ? ' active' : ''}`} type="button" onClick={() => escolherPeriodo(op.periodo)}>{op.rotulo}</button>
              ))}
            </div>
            <label className="meal-filter-date">
              <span>Buscar por dia</span>
              <input type="date" max={paraISO(new Date())} value={diaEscolhido} onChange={(e) => escolherPeriodo(e.target.value ? { tipo: 'dia', data: e.target.value } : null)} />
            </label>
            {periodo && <button className="meal-filter-clear" type="button" onClick={() => escolherPeriodo(null)}>Limpar filtro</button>}
          </div>
        )}

        <div className="meal-filter-tabs perf-abas">
          {ABAS.map((a) => (
            <button key={a.rotulo} className={`meal-filter-tab${aba === a.id ? ' active' : ''}`} type="button" onClick={() => setAba(a.id)}>{a.rotulo}</button>
          ))}
        </div>

        <h2 className="section-title">Jogos</h2>
        <p className="section-sub">{SUBTITULOS[ordem]}</p>

        <div className="sort-row">
          {ORDENS.map((o) => (
            <button key={o.id} className={`sort-btn${ordem === o.id ? ' active' : ''}`} type="button" aria-label={o.rotulo} title={o.rotulo} onClick={() => setOrdem(o.id)}>
              {o.texto}
            </button>
          ))}
        </div>

        {partidas === null && <p className="empty-note">Carregando…</p>}
        {erro && <p className="empty-note">{erro}</p>}
        {partidas !== null && !erro && ordenadas.length === 0 && <p className="empty-note">{aba || periodo ? 'Nenhuma partida com esse filtro.' : 'Nenhum jogo jogado ainda.'}</p>}

        <ul className="perf-lista">
          {ordenadas.map((p) => (
            <li key={p.id} className="perf-card">
              <div className="perf-topo" style={{ background: FUNDOS[p.jogo] || '#fff' }}>
                <span className="perf-jogo">{p.jogoNome}</span>
                <Estrelas n={p.estrelas} />
              </div>
              <div className="perf-corpo">
                <div className="perf-quando">
                  {p.criadoEm ? `${formatarData(p.criadoEm)} às ${formatarHora(p.criadoEm)}` : 'Agora mesmo'}
                </div>
                <NarradorPartida narrador={p.narrador} />
                {p.resumo && <div className="perf-resumo">{p.resumo}</div>}
                <DetalhePartida detalhes={p.detalhes} />
                <div className="perf-xp">+{p.xp} XP</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
