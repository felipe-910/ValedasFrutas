import { useMemo, useState } from 'react';
import DetalhePartida, { NarradorPartida } from './DetalhePartida';
import { formatarData, formatarHora, paraMillis } from '../lib/tempo';
import type { IdJogo, Partida } from '../types';

// Lista das partidas dos minijogos (o antigo "Desempenho"), dentro do painel > Minijogos.
// As partidas já chegam filtradas pelo período escolhido no painel (7 ou 30 dias).

type Ordem = 'recentes' | 'antigas' | 'az' | 'za';

const ORDENS: Array<{ id: Ordem; rotulo: string; texto: string }> = [
  { id: 'recentes', rotulo: 'Mais recentes primeiro', texto: '↓' },
  { id: 'antigas', rotulo: 'Mais antigas primeiro', texto: '↑' },
  { id: 'az', rotulo: 'Jogos de A a Z', texto: 'A' },
  { id: 'za', rotulo: 'Jogos de Z a A', texto: 'Z' }
];

const JOGOS: Array<{ id: IdJogo | null; rotulo: string }> = [
  { id: null, rotulo: 'Todos' },
  { id: 'cesta', rotulo: 'Cesta' },
  { id: 'semaforo', rotulo: 'Semáforo' },
  { id: 'prato', rotulo: 'Prato' }
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

export default function HistoricoPartidas({ partidas }: { partidas: Partida[] }) {
  const [ordem, setOrdem] = useState<Ordem>('recentes');
  const [jogo, setJogo] = useState<IdJogo | null>(null);

  const ordenadas = useMemo(() => {
    // partida recém-salva ainda pode estar sem a data do servidor: é a mais nova
    const quando = (p: Partida) => (p.criadoEm ? paraMillis(p.criadoEm) : Number.MAX_SAFE_INTEGER);
    const lista = partidas.filter((p) => !jogo || p.jogo === jogo);
    const porNome = (a: Partida, b: Partida) => (a.jogoNome || '').localeCompare(b.jogoNome || '', 'pt-BR') || quando(b) - quando(a);
    if (ordem === 'recentes') return lista.sort((a, b) => quando(b) - quando(a));
    if (ordem === 'antigas') return lista.sort((a, b) => quando(a) - quando(b));
    if (ordem === 'az') return lista.sort(porNome);
    return lista.sort((a, b) => -porNome(a, b) || quando(b) - quando(a));
  }, [partidas, ordem, jogo]);

  return (
    <section className="pn-historico">
      <h2 className="pn-cartao-titulo">Partidas</h2>
      <p className="pn-cartao-sub">O resultado de cada partida: o que acertou, o que errou e o XP ganho</p>

      <div className="meal-filter-tabs perf-abas">
        {JOGOS.map((j) => (
          <button key={j.rotulo} className={`meal-filter-tab${jogo === j.id ? ' active' : ''}`} type="button" onClick={() => setJogo(j.id)}>{j.rotulo}</button>
        ))}
      </div>

      <div className="sort-row">
        {ORDENS.map((o) => (
          <button key={o.id} className={`sort-btn${ordem === o.id ? ' active' : ''}`} type="button" aria-label={o.rotulo} title={o.rotulo} onClick={() => setOrdem(o.id)}>
            {o.texto}
          </button>
        ))}
      </div>

      {ordenadas.length === 0 && <p className="empty-note">Nenhuma partida desse jogo nesse período.</p>}

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
    </section>
  );
}
