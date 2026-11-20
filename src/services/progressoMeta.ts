// Cálculo do progresso das metas de refeição e de alimento, a partir das refeições registradas.
// Só funções puras (sem Firestore), para poderem ser usadas por metas.ts e notificacoes.ts.
import { paraData } from '../lib/tempo';
import type { Meta, ProgressoMeta, Refeicao, TipoRefeicao } from '../types';

export function normalizar(texto: string | undefined): string {
  return (texto || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function chaveDoDia(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

// Helpers que também entendem metas antigas (uma refeição só, XP por dia)
export function refeicoesDaMeta(meta: Pick<Meta, 'tiposRefeicao' | 'tipoRefeicao'>): TipoRefeicao[] {
  if (Array.isArray(meta.tiposRefeicao) && meta.tiposRefeicao.length) return meta.tiposRefeicao;
  return meta.tipoRefeicao ? [meta.tipoRefeicao] : [];
}

export function xpTotalDaMeta(meta: Pick<Meta, 'xpTotal' | 'dias' | 'xpPorDia'>): number {
  if (typeof meta.xpTotal === 'number') return meta.xpTotal;
  return (meta.dias || 0) * (meta.xpPorDia || 0);
}

// A partir de quando as refeições contam para a meta:
// - meta nova: desde o começo do dia em que foi criada;
// - meta reaberta (`inicioEm`): só o que for registrado depois da reabertura.
export function corteDaMeta(meta: Pick<Meta, 'inicioEm' | 'criadoEm'>): Date {
  const reaberta = paraData(meta.inicioEm);
  if (reaberta) return reaberta;
  const inicio = paraData(meta.criadoEm) ?? new Date();
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
}

// Um dia só conta quando TODAS as refeições da meta foram completas nele
// (meta de alimento: o alimento foi comido em alguma refeição completa do dia).
// O XP é dividido igualmente pelos dias: ao cumprir o último dia, a criança tem o XP total.
export function calcularProgressoMeta(meta: Meta, refeicoes: Refeicao[]): ProgressoMeta {
  const corte = corteDaMeta(meta).getTime();
  const alvo = refeicoesDaMeta(meta);
  const porDia = new Map<string, Set<string>>(); // dia -> Set de refeições completas (ou 'ok', no caso de alimento)

  refeicoes.forEach((r) => {
    if (r.status !== 'completa') return;
    const data = paraData(r.criadoEm);
    if (!data || data.getTime() < corte) return;
    const dia = chaveDoDia(data);

    if (meta.tipo === 'refeicao') {
      if (!alvo.includes(r.tipo)) return;
      const set = porDia.get(dia) ?? new Set<string>();
      set.add(r.tipo);
      porDia.set(dia, set);
    } else if ((r.alimentos || []).some((a) => normalizar(a.nome) === normalizar(meta.alimento))) {
      porDia.set(dia, new Set(['ok']));
    }
  });

  const exigidas = meta.tipo === 'refeicao' ? alvo.length : 1;
  let diasOk = 0;
  porDia.forEach((set) => { if (exigidas > 0 && set.size >= exigidas) diasOk++; });

  const total = meta.dias || 0;
  const diasCumpridos = Math.min(diasOk, total);
  const xpTotal = xpTotalDaMeta(meta);
  return {
    diasCumpridos,
    xpAtual: total ? Math.round((xpTotal * diasCumpridos) / total) : 0,
    concluida: total > 0 && diasCumpridos >= total
  };
}
