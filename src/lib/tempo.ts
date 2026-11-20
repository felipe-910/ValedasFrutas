import type { Timestamp } from 'firebase/firestore';

// Timestamp do Firestore -> Date (ou null, se ainda não tiver valor do servidor)
export function paraData(ts: Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

// Timestamp do Firestore -> milissegundos (0 se não houver)
export function paraMillis(ts: Timestamp | null | undefined): number {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}

export function formatarData(ts: Timestamp | null | undefined): string {
  const d = paraData(ts);
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

export function formatarHora(ts: Timestamp | null | undefined): string {
  const d = paraData(ts);
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// ---------- Filtro por período (lista de refeições) ----------
export type PeriodoRefeicoes =
  | { tipo: 'hoje' }
  | { tipo: 'semana' }
  | { tipo: 'semana_passada' }
  | { tipo: 'dia'; data: string }; // AAAA-MM-DD

export interface Intervalo {
  inicio: Date; // inclusive
  fim: Date; // exclusive
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Transforma o período escolhido em um intervalo de datas (a semana vai de domingo a sábado)
export function intervaloDoPeriodo(periodo: PeriodoRefeicoes, agora: Date = new Date()): Intervalo | null {
  const hoje = inicioDoDia(agora);
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  if (periodo.tipo === 'hoje') return { inicio: hoje, fim: amanha };

  const domingo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
  if (periodo.tipo === 'semana') {
    return { inicio: domingo, fim: new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() + 7) };
  }
  if (periodo.tipo === 'semana_passada') {
    return { inicio: new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() - 7), fim: domingo };
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodo.data);
  if (!m) return null;
  const dia = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { inicio: dia, fim: new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1) };
}

export function rotuloDoPeriodo(periodo: PeriodoRefeicoes): string {
  if (periodo.tipo === 'hoje') return 'Hoje';
  if (periodo.tipo === 'semana') return 'Essa semana';
  if (periodo.tipo === 'semana_passada') return 'Semana passada';
  const [a, m, d] = periodo.data.split('-');
  return `${d}/${m}/${a}`;
}
