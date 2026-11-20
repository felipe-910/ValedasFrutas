// Contas dos painéis (dashboards) da área dos pais: refeições, minijogos e metas.
// Aqui só tem cálculo, sem Firebase: as telas buscam os dados e passam para estas funções.
import { TIPOS_REFEICAO } from '../types';
import type { IdJogo, Meta, Partida, Refeicao, StatusRefeicao, TipoRefeicao } from '../types';
import { paraData } from './tempo';

// ---------- Período ----------
export type DiasPainel = 7 | 30 | 90;

export const OPCOES_DIAS: DiasPainel[] = [7, 30, 90];

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function somarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Primeiro instante do período: "últimos 7 dias" = hoje e os 6 dias antes
export function inicioDoPeriodo(dias: DiasPainel, agora: Date = new Date()): Date {
  return somarDias(inicioDoDia(agora), -(dias - 1));
}

// Data de um registro (um registro recém-salvo ainda sem data do servidor conta como "agora")
function dataDe(item: { criadoEm?: Refeicao['criadoEm'] }): Date {
  return paraData(item.criadoEm) ?? new Date();
}

function dentroDoPeriodo<T extends { criadoEm?: Refeicao['criadoEm'] }>(lista: T[], dias: DiasPainel, agora: Date): T[] {
  const ini = inicioDoPeriodo(dias, agora).getTime();
  return lista.filter((item) => dataDe(item).getTime() >= ini);
}

// Os "baldes" do gráfico de barras: um por dia (7 e 30 dias) ou um por semana (90 dias)
export interface Balde {
  inicio: Date;
  fim: Date; // exclusivo
  rotulo: string; // o que aparece embaixo da barra
  rotuloLongo: string; // para leitores de tela
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function baldesDoPeriodo(dias: DiasPainel, agora: Date = new Date()): Balde[] {
  const ini = inicioDoPeriodo(dias, agora);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const baldes: Balde[] = [];
  if (dias <= 30) {
    for (let i = 0; i < dias; i++) {
      const d = somarDias(ini, i);
      // com 30 barras não cabe um rótulo em cada: mostra só alguns dias
      const rotulo = dias === 7 ? DIAS_SEMANA[d.getDay()] : (i % 5 === 0 || i === dias - 1 ? String(d.getDate()) : '');
      baldes.push({ inicio: d, fim: somarDias(d, 1), rotulo, rotuloLongo: fmt(d) });
    }
    return baldes;
  }
  // 90 dias: semanas de 7 dias, terminando hoje
  const fimTotal = somarDias(inicioDoDia(agora), 1);
  for (let fim = fimTotal; fim > ini; fim = somarDias(fim, -7)) {
    const inicio = new Date(Math.max(somarDias(fim, -7).getTime(), ini.getTime()));
    baldes.unshift({ inicio, fim, rotulo: '', rotuloLongo: `${fmt(inicio)} a ${fmt(somarDias(fim, -1))}` });
  }
  baldes.forEach((b, i) => { if (i % 3 === 0 || i === baldes.length - 1) b.rotulo = fmt(b.inicio); });
  return baldes;
}

function noBalde(baldes: Balde[], d: Date): number {
  const t = d.getTime();
  return baldes.findIndex((b) => t >= b.inicio.getTime() && t < b.fim.getTime());
}

export function formatarNumero(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
}

// ---------- Refeições ----------
export type ContagemStatus = Record<StatusRefeicao, number>;

const zerarStatus = (): ContagemStatus => ({ completa: 0, metade: 0, nao_comeu: 0 });

export interface AlimentoContado {
  nome: string;
  icone?: string;
  vezes: number;
}

export interface ResumoRefeicoes {
  total: number;
  status: ContagemStatus;
  comStatus: number; // refeições em que foi anotado como a criança comeu
  diasComRegistro: number;
  diasNoPeriodo: number;
  porTipo: Array<{ tipo: TipoRefeicao; status: ContagemStatus; total: number }>;
  porBalde: Array<{ balde: Balde; status: ContagemStatus; total: number }>;
  aceitos: AlimentoContado[]; // mais vezes em refeições que ela comeu tudo
  recusados: AlimentoContado[]; // mais vezes em refeições que ela não comeu
}

function topAlimentos(refeicoes: Refeicao[], status: StatusRefeicao, quantos = 5): AlimentoContado[] {
  const mapa = new Map<string, AlimentoContado>();
  for (const r of refeicoes) {
    if (r.status !== status) continue;
    // o mesmo alimento duas vezes na mesma refeição conta uma vez só
    const vistos = new Set<string>();
    for (const a of r.alimentos || []) {
      const chave = (a.nome || '').trim().toLowerCase();
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      const atual = mapa.get(chave);
      if (atual) atual.vezes++;
      else mapa.set(chave, { nome: a.nome.trim(), icone: a.icone, vezes: 1 });
    }
  }
  return [...mapa.values()].sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, quantos);
}

export function resumirRefeicoes(todas: Refeicao[], dias: DiasPainel, agora: Date = new Date()): ResumoRefeicoes {
  const lista = dentroDoPeriodo(todas, dias, agora);
  const status = zerarStatus();
  const porTipo = new Map<TipoRefeicao, ContagemStatus>(TIPOS_REFEICAO.map((t) => [t, zerarStatus()]));
  const baldes = baldesDoPeriodo(dias, agora);
  const porBalde = baldes.map((balde) => ({ balde, status: zerarStatus(), total: 0 }));
  const dias_ = new Set<string>();

  for (const r of lista) {
    const d = dataDe(r);
    dias_.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    const i = noBalde(baldes, d);
    if (i >= 0) porBalde[i].total++;
    if (!r.status) continue;
    status[r.status]++;
    const doTipo = porTipo.get(r.tipo);
    if (doTipo) doTipo[r.status]++;
    if (i >= 0) porBalde[i].status[r.status]++;
  }

  return {
    total: lista.length,
    status,
    comStatus: status.completa + status.metade + status.nao_comeu,
    diasComRegistro: dias_.size,
    diasNoPeriodo: dias,
    porTipo: TIPOS_REFEICAO.map((tipo) => {
      const s = porTipo.get(tipo) ?? zerarStatus();
      return { tipo, status: s, total: s.completa + s.metade + s.nao_comeu };
    }),
    porBalde,
    aceitos: topAlimentos(lista, 'completa'),
    recusados: topAlimentos(lista, 'nao_comeu')
  };
}

// ---------- Minijogos ----------
export const JOGOS: Array<{ id: IdJogo; nome: string; fundo: string }> = [
  { id: 'prato', nome: 'Monte seu prato', fundo: '#ffeccb' },
  { id: 'semaforo', nome: 'Semáforo Saudável', fundo: '#dcf3e0' },
  { id: 'cesta', nome: 'Cesta Saudável', fundo: '#d9f0fb' }
];

export interface ResumoJogo {
  jogo: IdJogo;
  nome: string;
  fundo: string;
  partidas: number;
  media: number; // média de estrelas (0 se não jogou)
  melhor: number;
  ultimas: number[]; // estrelas das últimas partidas, da mais antiga para a mais nova
}

export interface Dificuldade {
  nome: string;
  erros: number;
  jogos: string[]; // em quais jogos errou
}

export interface ResumoJogos {
  total: number;
  diasNoPeriodo: number;
  media: number;
  xp: number;
  tresEstrelas: number;
  porJogo: ResumoJogo[];
  porBalde: Array<{ balde: Balde; partidas: number; media: number }>;
  dificuldades: Dificuldade[];
}

export function resumirPartidas(todas: Partida[], dias: DiasPainel, agora: Date = new Date()): ResumoJogos {
  const lista = dentroDoPeriodo(todas, dias, agora).sort((a, b) => dataDe(a).getTime() - dataDe(b).getTime());
  const baldes = baldesDoPeriodo(dias, agora);
  const somaBalde = baldes.map(() => ({ partidas: 0, estrelas: 0 }));
  const erros = new Map<string, Dificuldade>();

  function anotarErro(nome: string, jogo: string, vezes = 1) {
    const chave = nome.trim().toLowerCase();
    if (!chave) return;
    const atual = erros.get(chave) ?? { nome: nome.trim(), erros: 0, jogos: [] };
    atual.erros += vezes;
    if (!atual.jogos.includes(jogo)) atual.jogos.push(jogo);
    erros.set(chave, atual);
  }

  let estrelas = 0;
  let xp = 0;
  let tresEstrelas = 0;
  for (const p of lista) {
    estrelas += p.estrelas || 0;
    xp += p.xp || 0;
    if (p.estrelas >= 3) tresEstrelas++;
    const i = noBalde(baldes, dataDe(p));
    if (i >= 0) { somaBalde[i].partidas++; somaBalde[i].estrelas += p.estrelas || 0; }
    const det = p.detalhes;
    if (det?.tipo === 'semaforo') {
      for (const r of det.respostas || []) if (r.escolha !== r.certa) anotarErro(r.nome, 'Semáforo');
    } else if (det?.tipo === 'cesta') {
      for (const item of det.errados || []) anotarErro(item.nome, 'Cesta', 1);
    }
  }

  const porJogo = JOGOS.map(({ id, nome, fundo }) => {
    const doJogo = lista.filter((p) => p.jogo === id);
    const soma = doJogo.reduce((s, p) => s + (p.estrelas || 0), 0);
    return {
      jogo: id,
      nome,
      fundo,
      partidas: doJogo.length,
      media: doJogo.length ? soma / doJogo.length : 0,
      melhor: doJogo.reduce((m, p) => Math.max(m, p.estrelas || 0), 0),
      ultimas: doJogo.slice(-8).map((p) => p.estrelas || 0)
    };
  });

  return {
    total: lista.length,
    diasNoPeriodo: dias,
    media: lista.length ? estrelas / lista.length : 0,
    xp,
    tresEstrelas,
    porJogo,
    porBalde: baldes.map((balde, i) => ({
      balde,
      partidas: somaBalde[i].partidas,
      media: somaBalde[i].partidas ? somaBalde[i].estrelas / somaBalde[i].partidas : 0
    })),
    dificuldades: [...erros.values()].sort((a, b) => b.erros - a.erros || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 5)
  };
}

// ---------- Metas ----------
export interface ResumoMetas {
  total: number;
  ativas: Meta[]; // as mais perto de terminar primeiro
  concluidas: Meta[]; // as mais recentes primeiro
  taxa: number; // % de metas concluídas
  xpGanho: number;
  diasCumpridos: number;
}

// Quanto da meta já foi feito (0 a 1). Meta simples (sem dias) não tem progresso parcial.
export function progressoDaMeta(meta: Meta): number {
  if (meta.concluida) return 1;
  const total = meta.dias || 0;
  return total ? Math.min(1, (meta.diasCumpridos || 0) / total) : 0;
}

export function resumirMetas(metas: Meta[]): ResumoMetas {
  const ms = (m: Meta) => paraData(m.criadoEm)?.getTime() ?? Date.now();
  const ativas = metas.filter((m) => !m.concluida).sort((a, b) => progressoDaMeta(b) - progressoDaMeta(a) || ms(b) - ms(a));
  const concluidas = metas.filter((m) => m.concluida).sort((a, b) => ms(b) - ms(a));
  return {
    total: metas.length,
    ativas,
    concluidas,
    taxa: metas.length ? (concluidas.length / metas.length) * 100 : 0,
    xpGanho: metas.reduce((s, m) => s + (m.xpAtual || 0), 0),
    diasCumpridos: metas.reduce((s, m) => s + (m.diasCumpridos || 0), 0)
  };
}
