// Painéis (dashboards) da área dos pais: refeições, minijogos e metas.
// Só desenham: os números chegam prontos de lib/painel.ts. Os gráficos são feitos com HTML/CSS,
// sem biblioteca, e cada um tem uma descrição em texto para leitores de tela.
import type { ReactNode } from 'react';
import BarraTopo from './BarraTopo';
import Icone from './Icone';
import PerfilMini from './PerfilMini';
import { corEhClara } from '../lib/cores';
import { OPCOES_DIAS, formatarNumero, progressoDaMeta } from '../lib/painel';
import type { Balde, ContagemStatus, DiasPainel, ResumoJogos, ResumoMetas, ResumoRefeicoes } from '../lib/painel';
import { refeicoesDaMeta, xpTotalDaMeta } from '../services/progressoMeta';
import type { FilhoAtivo, Meta, StatusRefeicao } from '../types';

export type AbaPainel = 'refeicoes' | 'jogos' | 'metas';

const ABAS: Array<{ id: AbaPainel; rotulo: string }> = [
  { id: 'refeicoes', rotulo: 'Refeições' },
  { id: 'jogos', rotulo: 'Minijogos' },
  { id: 'metas', rotulo: 'Metas' }
];

const STATUS: Array<{ id: StatusRefeicao; nome: string; cor: string }> = [
  { id: 'completa', nome: 'Comeu tudo', cor: '#6fa981' },
  { id: 'metade', nome: 'Comeu metade', cor: '#f2b84b' },
  { id: 'nao_comeu', nome: 'Não comeu', cor: '#e8796f' }
];
const COR_SEM_INFO = '#d9d4cb';

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0);
const vezes = (n: number) => `${n} ${n === 1 ? 'vez' : 'vezes'}`;
const partidasTxt = (n: number) => `${n} ${n === 1 ? 'partida' : 'partidas'}`;

// ---------- Peças em comum ----------
function Numeros({ itens }: { itens: Array<{ icone: string; valor: string; rotulo: string }> }) {
  return (
    <div className="pn-numeros">
      {itens.map((n) => (
        <div key={n.rotulo} className="pn-numero">
          <Icone nome={n.icone} cor="6fa981" tamanho={20} />
          <span className="pn-numero-valor">{n.valor}</span>
          <span className="pn-numero-rotulo">{n.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

function Cartao({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) {
  return (
    <section className="pn-cartao">
      <h2 className="pn-cartao-titulo">{titulo}</h2>
      {sub && <p className="pn-cartao-sub">{sub}</p>}
      {children}
    </section>
  );
}

function Legenda({ semInfo = false }: { semInfo?: boolean }) {
  return (
    <div className="pn-legenda" aria-hidden="true">
      {STATUS.map((s) => <span key={s.id}><i style={{ background: s.cor }} />{s.nome}</span>)}
      {semInfo && <span><i style={{ background: COR_SEM_INFO }} />Sem anotação</span>}
    </div>
  );
}

// Barra deitada dividida em comeu tudo / metade / não comeu
function BarraStatus({ status }: { status: ContagemStatus }) {
  const total = status.completa + status.metade + status.nao_comeu;
  return (
    <div className="pn-barra">
      {total === 0
        ? <span className="pn-barra-vazia" />
        : STATUS.map((s) => (status[s.id] ? <span key={s.id} style={{ width: `${(status[s.id] / total) * 100}%`, background: s.cor }} /> : null))}
    </div>
  );
}

interface Coluna {
  balde: Balde;
  total: number;
  partes: Array<{ cor: string; valor: number }>;
  texto: string; // descrição para leitor de tela
}

// Gráfico de colunas (uma por dia ou por semana). Cada coluna pode ter partes empilhadas.
function Colunas({ colunas, descricao }: { colunas: Coluna[]; descricao: string }) {
  const max = Math.max(1, ...colunas.map((c) => c.total));
  const poucas = colunas.length <= 7;
  return (
    <figure className="pn-colunas-fig">
      <div className={`pn-colunas${poucas ? ' poucas' : ''}`} role="img" aria-label={`${descricao}. ${colunas.filter((c) => c.total).map((c) => c.texto).join('; ') || 'Nenhum registro.'}`}>
        {colunas.map((c) => (
          <div key={c.balde.inicio.getTime()} className="pn-coluna" title={c.texto}>
            <div className="pn-coluna-barra" style={{ height: `${(c.total / max) * 100}%` }}>
              {poucas && c.total > 0 && <span className="pn-coluna-valor">{c.total}</span>}
              <div className="pn-coluna-pilha">
                {c.partes.map((p, i) => (p.valor ? <span key={i} style={{ flexGrow: p.valor, background: p.cor }} /> : null))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`pn-colunas-eixo${poucas ? ' poucas' : ''}`} aria-hidden="true">
        {colunas.map((c) => <span key={c.balde.inicio.getTime()}>{c.balde.rotulo}</span>)}
      </div>
    </figure>
  );
}

function Estrelas({ valor, tamanho = 16 }: { valor: number; tamanho?: number }) {
  // estrelas cheias até a média arredondada para meia estrela
  const meio = Math.round(valor * 2) / 2;
  return (
    <span className="pn-estrelas" style={{ fontSize: tamanho }} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={meio >= i ? 'cheia' : meio >= i - 0.5 ? 'meia' : ''}>★</span>
      ))}
    </span>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="pn-vazio">{children}</p>;
}

// ---------- Refeições ----------
function destaquesRefeicoes(r: ResumoRefeicoes, nome: string): string[] {
  const comDados = r.porTipo.filter((t) => t.total >= 2);
  if (!comDados.length) return [];
  const taxa = (t: (typeof comDados)[number], s: StatusRefeicao) => t.status[s] / t.total;
  const melhor = [...comDados].sort((a, b) => taxa(b, 'completa') - taxa(a, 'completa'))[0];
  const pior = [...comDados].sort((a, b) => taxa(b, 'nao_comeu') - taxa(a, 'nao_comeu'))[0];
  // "a janta" é feminino; as outras refeições são masculinas
  const fem = (t: string) => t === 'Janta';
  const frases: string[] = [];
  if (taxa(melhor, 'completa') > 0) {
    frases.push(`${nome} come melhor ${fem(melhor.tipo) ? 'na' : 'no'} ${melhor.tipo.toLowerCase()}: comeu tudo em ${pct(melhor.status.completa, melhor.total)}% das vezes.`);
  }
  if (pior.tipo !== melhor.tipo && taxa(pior, 'nao_comeu') > 0) {
    const art = fem(pior.tipo) ? 'A' : 'O';
    frases.push(`${art} ${pior.tipo.toLowerCase()} é ${fem(pior.tipo) ? 'a' : 'o'} mais difícil: não comeu em ${pct(pior.status.nao_comeu, pior.total)}% das vezes.`);
  }
  return frases;
}

function ListaAlimentos({ titulo, itens, cor, vazio }: { titulo: string; itens: ResumoRefeicoes['aceitos']; cor: string; vazio: string }) {
  return (
    <div className="pn-alimentos-col">
      <h3 className="pn-alimentos-titulo"><i style={{ background: cor }} />{titulo}</h3>
      {itens.length === 0 ? <p className="pn-alimentos-vazio">{vazio}</p> : (
        <ul className="pn-alimentos">
          {itens.map((a) => (
            <li key={a.nome}>
              {a.icone ? <Icone nome={a.icone} cor="588a68" tamanho={18} /> : <span style={{ width: 18 }} />}
              <span className="pn-alimento-nome">{a.nome}</span>
              <span className="pn-alimento-vezes">{vezes(a.vezes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PainelRefeicoes({ resumo, nome }: { resumo: ResumoRefeicoes; nome: string }) {
  const r = resumo;
  if (r.total === 0) {
    return <Vazio>Nenhuma refeição registrada nesse período. Registre as refeições em "Registrar refeições" para ver os gráficos aqui.</Vazio>;
  }
  const semana = r.diasNoPeriodo > 30;
  const destaques = destaquesRefeicoes(r, nome);
  const temSemInfo = r.porBalde.some((b) => b.total > b.status.completa + b.status.metade + b.status.nao_comeu);
  const colunas: Coluna[] = r.porBalde.map((b) => {
    const semInfo = b.total - (b.status.completa + b.status.metade + b.status.nao_comeu);
    return {
      balde: b.balde,
      total: b.total,
      partes: [...STATUS.map((s) => ({ cor: s.cor, valor: b.status[s.id] })), { cor: COR_SEM_INFO, valor: semInfo }],
      texto: `${b.balde.rotuloLongo}: ${b.total} ${b.total === 1 ? 'refeição' : 'refeições'}`
    };
  });

  return (
    <>
      <Numeros itens={[
        { icone: 'mdi:silverware-fork-knife', valor: String(r.total), rotulo: r.total === 1 ? 'refeição' : 'refeições' },
        { icone: 'mdi:check-circle-outline', valor: r.comStatus ? `${pct(r.status.completa, r.comStatus)}%` : '—', rotulo: 'comeu tudo' },
        { icone: 'mdi:calendar-clock', valor: `${r.diasComRegistro}/${r.diasNoPeriodo}`, rotulo: 'dias anotados' }
      ]} />

      {r.comStatus > 0 && (
        <Cartao titulo="Como comeu" sub={`Em ${r.comStatus} ${r.comStatus === 1 ? 'refeição anotada' : 'refeições anotadas'}`}>
          <div className="pn-barra grande" role="img" aria-label={STATUS.map((s) => `${s.nome}: ${pct(r.status[s.id], r.comStatus)}%`).join(', ')}>
            {STATUS.map((s) => (r.status[s.id] ? <span key={s.id} style={{ width: `${(r.status[s.id] / r.comStatus) * 100}%`, background: s.cor }} /> : null))}
          </div>
          <div className="pn-status-numeros">
            {STATUS.map((s) => (
              <div key={s.id}>
                <span className="pn-status-pct" style={{ color: s.id === 'metade' ? '#b07a12' : s.id === 'nao_comeu' ? '#c2493e' : '#4f9366' }}>{pct(r.status[s.id], r.comStatus)}%</span>
                <span className="pn-status-nome">{s.nome}</span>
              </div>
            ))}
          </div>
          {destaques.length > 0 && <ul className="pn-destaques">{destaques.map((f) => <li key={f}>{f}</li>)}</ul>}
        </Cartao>
      )}

      <Cartao titulo={semana ? 'Refeições por semana' : 'Refeições por dia'}>
        <Colunas colunas={colunas} descricao={semana ? 'Refeições registradas por semana' : 'Refeições registradas por dia'} />
        <Legenda semInfo={temSemInfo} />
      </Cartao>

      <Cartao titulo="Em cada refeição">
        <div className="pn-tipos">
          {r.porTipo.map((t) => (
            <div key={t.tipo} className="pn-tipo" role="img" aria-label={t.total ? `${t.tipo}: ${STATUS.map((s) => `${s.nome} ${t.status[s.id]}`).join(', ')}` : `${t.tipo}: sem anotação`}>
              <span className="pn-tipo-nome">{t.tipo}</span>
              <BarraStatus status={t.status} />
              <span className="pn-tipo-total">{t.total || '—'}</span>
            </div>
          ))}
        </div>
        <Legenda />
      </Cartao>

      <Cartao titulo="Alimentos" sub="Os que mais aparecem quando comeu tudo e quando não comeu">
        <div className="pn-alimentos-grade">
          <ListaAlimentos titulo="Comeu tudo" itens={r.aceitos} cor="#6fa981" vazio="Nenhum ainda." />
          <ListaAlimentos titulo="Não comeu" itens={r.recusados} cor="#e8796f" vazio="Nenhum. Que bom!" />
        </div>
      </Cartao>
    </>
  );
}

// ---------- Minijogos ----------
const COR_RESULTADO: Record<number, string> = { 1: '#e8796f', 2: '#f2b84b', 3: '#6fa981' };

export function PainelJogos({ resumo }: { resumo: ResumoJogos }) {
  const r = resumo;
  if (r.total === 0) {
    return <Vazio>Nenhum minijogo jogado nesse período. Quando a criança jogar, o desempenho aparece aqui.</Vazio>;
  }
  const semana = r.diasNoPeriodo > 30;
  const colunas: Coluna[] = r.porBalde.map((b) => ({
    balde: b.balde,
    total: b.partidas,
    partes: [{ cor: '#6fa981', valor: b.partidas }],
    texto: `${b.balde.rotuloLongo}: ${partidasTxt(b.partidas)}${b.partidas ? `, média de ${formatarNumero(b.media)} estrelas` : ''}`
  }));

  return (
    <>
      <Numeros itens={[
        { icone: 'mdi:gamepad-variant', valor: String(r.total), rotulo: r.total === 1 ? 'partida' : 'partidas' },
        { icone: 'mdi:star', valor: formatarNumero(r.media), rotulo: 'estrelas em média' },
        { icone: 'mdi:trophy', valor: r.xp.toLocaleString('pt-BR'), rotulo: 'XP ganho' }
      ]} />

      <Cartao titulo="Cada minijogo">
        <div className="pn-jogos">
          {r.porJogo.map((j) => (
            <div key={j.jogo} className="pn-jogo" style={{ background: j.fundo }}>
              <div className="pn-jogo-topo">
                <span className="pn-jogo-nome">{j.nome}</span>
                <span className="pn-jogo-partidas">{partidasTxt(j.partidas)}</span>
              </div>
              {j.partidas === 0 ? <p className="pn-jogo-vazio">Ainda não jogou nesse período.</p> : (
                <>
                  <div className="pn-jogo-media" role="img" aria-label={`Média de ${formatarNumero(j.media)} de 3 estrelas, melhor resultado ${j.melhor} estrelas`}>
                    <Estrelas valor={j.media} tamanho={22} />
                    <span className="pn-jogo-media-num">{formatarNumero(j.media)}</span>
                    <span className="pn-jogo-melhor">melhor: {j.melhor} ★</span>
                  </div>
                  <div className="pn-jogo-ultimas" role="img" aria-label={`Últimas partidas: ${j.ultimas.join(', ')} estrelas`}>
                    <span>Últimas</span>
                    {j.ultimas.map((e, i) => <i key={i} style={{ background: COR_RESULTADO[e] || '#ccc' }} title={`${e} ${e === 1 ? 'estrela' : 'estrelas'}`}>{e}</i>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao titulo={semana ? 'Partidas por semana' : 'Partidas por dia'}>
        <Colunas colunas={colunas} descricao={semana ? 'Partidas jogadas por semana' : 'Partidas jogadas por dia'} />
      </Cartao>

      <Cartao titulo="Onde precisa de ajuda" sub="Alimentos que mais errou no Semáforo e na Cesta">
        {r.dificuldades.length === 0 ? <p className="pn-alimentos-vazio">Nenhum erro registrado nesse período. Muito bem!</p> : (
          <ul className="pn-ajuda">
            {r.dificuldades.map((d) => (
              <li key={d.nome}>
                <span className="pn-ajuda-nome">{d.nome}</span>
                <span className="pn-ajuda-jogos">{d.jogos.join(' e ')}</span>
                <span className="pn-ajuda-erros">errou {vezes(d.erros)}</span>
              </li>
            ))}
          </ul>
        )}
        {r.dificuldades.length > 0 && <p className="pn-dica">Dica: conversem sobre esses alimentos na hora das refeições.</p>}
      </Cartao>
    </>
  );
}

// ---------- Metas ----------
function regraCurta(meta: Meta): string {
  if (meta.tipo === 'alimento') return `Comer ${meta.alimento || 'o alimento'} em refeição completa`;
  if (meta.tipo === 'refeicao') {
    const tipos = refeicoesDaMeta(meta);
    if (tipos.length === 5) return 'Todas as refeições completas';
    if (tipos.length === 1) return `${tipos[0]} ${tipos[0] === 'Janta' ? 'completa' : 'completo'}`;
    const nomes = tipos.map((t) => t.toLowerCase());
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} completos`.replace(/^./, (c) => c.toUpperCase());
  }
  return 'Meta livre, marcada pelo responsável';
}

function CorDaMeta({ cor }: { cor?: string }) {
  return <span className="pn-meta-cor" style={{ background: cor || '#6fa981', borderColor: corEhClara(cor) ? 'rgba(0,0,0,.15)' : 'transparent' }} />;
}

export function PainelMetas({ resumo }: { resumo: ResumoMetas }) {
  const r = resumo;
  if (r.total === 0) {
    return <Vazio>Nenhuma meta criada ainda. Crie uma meta na tela "Metas" para acompanhar aqui.</Vazio>;
  }
  return (
    <>
      <Numeros itens={[
        { icone: 'mdi:flag-variant', valor: String(r.ativas.length), rotulo: 'em andamento' },
        { icone: 'mdi:check-circle-outline', valor: String(r.concluidas.length), rotulo: r.concluidas.length === 1 ? 'concluída' : 'concluídas' },
        { icone: 'mdi:trophy', valor: r.xpGanho.toLocaleString('pt-BR'), rotulo: 'XP com metas' }
      ]} />

      <Cartao titulo="Metas concluídas">
        <div className="pn-conclusao">
          <span className="pn-conclusao-pct">{Math.round(r.taxa)}%</span>
          <div className="pn-conclusao-info">
            <div className="pn-progresso" role="img" aria-label={`${r.concluidas.length} de ${r.total} metas concluídas`}>
              <span style={{ width: `${r.taxa}%` }} />
            </div>
            <span className="pn-conclusao-txt">{r.concluidas.length} de {r.total} {r.total === 1 ? 'meta' : 'metas'} · {r.diasCumpridos} {r.diasCumpridos === 1 ? 'dia cumprido' : 'dias cumpridos'} no total</span>
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Em andamento" sub={r.ativas.length ? 'As mais perto de terminar aparecem primeiro' : undefined}>
        {r.ativas.length === 0 ? <p className="pn-alimentos-vazio">Nenhuma meta em andamento.</p> : (
          <ul className="pn-metas">
            {r.ativas.map((m) => {
              const total = m.dias || 0;
              const feito = m.diasCumpridos || 0;
              const prog = progressoDaMeta(m);
              return (
                <li key={m.id} className="pn-meta">
                  <div className="pn-meta-topo">
                    <CorDaMeta cor={m.cor} />
                    <span className="pn-meta-titulo">{m.titulo || 'Sem título'}</span>
                    {total > 0 && <span className="pn-meta-pct">{Math.round(prog * 100)}%</span>}
                  </div>
                  <p className="pn-meta-regra">{regraCurta(m)}</p>
                  {total > 0 && (
                    <>
                      <div className="pn-progresso" role="img" aria-label={`${feito} de ${total} dias`}><span style={{ width: `${prog * 100}%`, background: m.cor || undefined }} /></div>
                      <div className="pn-meta-rodape">
                        <span>{feito} de {total} {total === 1 ? 'dia' : 'dias'}</span>
                        <span>{m.xpAtual || 0}/{xpTotalDaMeta(m)} XP</span>
                      </div>
                    </>
                  )}
                  {m.recompensa && <p className="pn-meta-recompensa">Recompensa: <b>{m.recompensa}</b></p>}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      {r.concluidas.length > 0 && (
        <Cartao titulo="Conquistas">
          <ul className="pn-conquistas">
            {r.concluidas.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Icone nome="mdi:check-bold" cor="6fa981" tamanho={18} />
                <span className="pn-conquista-titulo">{m.titulo || 'Sem título'}</span>
                {m.recompensa && <span className="pn-conquista-recompensa">{m.recompensa}</span>}
              </li>
            ))}
          </ul>
          {r.concluidas.length > 6 && <p className="pn-dica">E mais {r.concluidas.length - 6} na aba "Concluídas" da tela de metas.</p>}
        </Cartao>
      )}
    </>
  );
}

// ---------- A tela inteira ----------
interface TelaProps {
  filho: FilhoAtivo;
  aba: AbaPainel;
  aoTrocarAba: (aba: AbaPainel) => void;
  dias: DiasPainel;
  aoTrocarDias: (dias: DiasPainel) => void;
  carregando: boolean;
  erro: string;
  children: ReactNode; // o painel da aba aberta
}

export function TelaPainel({ filho, aba, aoTrocarAba, dias, aoTrocarDias, carregando, erro, children }: TelaProps) {
  return (
    <>
      <BarraTopo titulo="Painel" voltarPara="/crianca" />

      <div className="child-body pn-pagina">
        <PerfilMini filho={filho} mostrarNivel />

        <div className="meal-filter-tabs pn-abas" role="tablist" aria-label="Painéis">
          {ABAS.map((a) => (
            <button key={a.id} className={`meal-filter-tab${aba === a.id ? ' active' : ''}`} type="button" role="tab" aria-selected={aba === a.id} onClick={() => aoTrocarAba(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba !== 'metas' && (
          <div className="pn-periodo" role="group" aria-label="Período">
            <span>Últimos</span>
            {OPCOES_DIAS.map((d) => (
              <button key={d} type="button" className={dias === d ? 'active' : ''} aria-pressed={dias === d} onClick={() => aoTrocarDias(d)}>{d} dias</button>
            ))}
          </div>
        )}

        <div role="tabpanel" aria-label={ABAS.find((a) => a.id === aba)?.rotulo}>
          {erro ? <Vazio>{erro}</Vazio> : carregando ? <Vazio>Carregando…</Vazio> : children}
        </div>
      </div>
    </>
  );
}
