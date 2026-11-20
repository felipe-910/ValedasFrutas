import type { Filho, Idade } from '../types';

// Lê uma data "AAAA-MM-DD" (formato do <input type="date">) sem sofrer com fuso horário
function lerData(texto: string | undefined): { ano: number; mes: number; dia: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '');
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  const d = new Date(ano, mes, dia);
  // recusa datas que não existem (ex.: 31/02)
  if (d.getFullYear() !== ano || d.getMonth() !== mes || d.getDate() !== dia) return null;
  return { ano, mes, dia };
}

// Devolve { anos, meses } completos desde o nascimento, ou null se a data for inválida ou futura
export function calcularIdade(dataNascimento: string | undefined, hoje: Date = new Date()): Idade | null {
  const n = lerData(dataNascimento);
  if (!n) return null;
  let totalMeses = (hoje.getFullYear() - n.ano) * 12 + (hoje.getMonth() - n.mes);
  if (hoje.getDate() < n.dia) totalMeses--;
  if (totalMeses < 0) return null;
  return { anos: Math.floor(totalMeses / 12), meses: totalMeses % 12 };
}

// "5 anos", "1 ano", "2 anos e 4 meses", "8 meses"...
export function formatarIdade(idade: Idade | null): string {
  if (!idade) return '—';
  const { anos, meses } = idade;
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  if (anos >= 1) {
    // até 2 anos é comum contar também os meses
    return anos < 3 && meses > 0
      ? `${plural(anos, 'ano', 'anos')} e ${plural(meses, 'mês', 'meses')}`
      : plural(anos, 'ano', 'anos');
  }
  return meses >= 1 ? plural(meses, 'mês', 'meses') : 'menos de 1 mês';
}

// Texto de idade de um pequeno. Usa a data de nascimento (sempre atualizada);
// cadastros antigos, que só têm o campo `idade`, continuam funcionando.
export function textoIdade(filho: Pick<Filho, 'dataNascimento' | 'idade'> | null | undefined): string {
  if (!filho) return '—';
  const calculada = calcularIdade(filho.dataNascimento);
  if (calculada) return formatarIdade(calculada);
  const anos = Number(filho.idade);
  return anos >= 0 && !Number.isNaN(anos) && filho.idade !== undefined && filho.idade !== ''
    ? formatarIdade({ anos, meses: 0 })
    : '—';
}

// Data local no formato AAAA-MM-DD (toISOString usaria UTC e poderia errar o dia)
export function paraISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}
