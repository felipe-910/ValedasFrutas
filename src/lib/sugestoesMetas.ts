// Sugestões de metas a partir das refeições registradas (só cálculo, sem Firebase).
//
// Olha as últimas refeições anotadas (até 10, dos últimos 14 dias) e procura:
//   1. grupo que não apareceu em nenhuma refeição   -> "não comeu nenhuma fruta nas últimas 8 refeições"
//   2. grupo que apareceu, mas não foi comido        -> "verduras e legumes apareceram 3 vezes e não comeu nenhuma"
//   3. grupo comido só uma vez em muitas refeições    -> "comeu uma proteína em só 1 das últimas 9 refeições"
//   4. muitos ultraprocessados (nugget, salsicha...)  -> META DE AUSÊNCIA do que mais apareceu ("Ficar sem nugget")
// Nos casos 1 a 3 a sugestão vem com uma META DE ALIMENTO pronta (ex.: "Comer banana"), de preferência com um
// alimento do grupo que a criança já comeu tudo. Tudo pode ser ajustado antes de salvar.
import { paraData } from './tempo';
import { ALIMENTO_PADRAO, GRUPOS, GRUPOS_DE_META, grupoDoAlimento } from './gruposAlimentares';
import type { IdGrupo } from './gruposAlimentares';
import type { Meta, Refeicao } from '../types';

export const MAX_REFEICOES_ANALISADAS = 10;
export const DIAS_ANALISADOS = 14;
export const MIN_REFEICOES = 4; // com menos que isso, ainda não dá para tirar conclusão
const DIAS_DA_META = 5;

export type MotivoSugestao = 'nenhum' | 'recusou' | 'pouco' | 'ultraprocessados';

export interface SugestaoMeta {
  tipo: 'alimento' | 'ausencia'; // tipo da meta sugerida
  id: string; // ex.: "frutas-nenhum" (usado para "agora não")
  grupo: IdGrupo; // grupo que faltou
  motivo: MotivoSugestao;
  mensagem: string; // o porquê, com os números
  convite: string; // 'Que tal a meta "comer banana" por 5 dias?'
  alimento: string; // alimento da meta (meta de alimento)
  titulo: string; // título da meta
  descricao: string; // descrição da meta (vai preenchida no formulário)
  dias: number;
}

// a meta de ausência (muitos ultraprocessados) vem logo depois do que falta de vez
const PRIORIDADE: Record<MotivoSugestao, number> = { nenhum: 0, ultraprocessados: 1, recusou: 2, pouco: 3 };

const refeicoesTxt = (n: number) => `${n === 1 ? 'a última refeição registrada' : `as últimas ${n} refeições registradas`}`;

// Refeições que entram na análise: as mais recentes primeiro, dentro da janela de dias
export function refeicoesParaAnalise(refeicoes: Refeicao[], agora: Date = new Date()): Refeicao[] {
  const desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (DIAS_ANALISADOS - 1)).getTime();
  return refeicoes
    .map((r) => ({ r, quando: (paraData(r.criadoEm) ?? agora).getTime() }))
    .filter((x) => x.quando >= desde)
    .sort((a, b) => b.quando - a.quando)
    .slice(0, MAX_REFEICOES_ANALISADAS)
    .map((x) => x.r);
}

function gruposDaRefeicao(r: Refeicao): Set<IdGrupo> {
  const grupos = new Set<IdGrupo>();
  (r.alimentos || []).forEach((a) => {
    const g = grupoDoAlimento(a.nome);
    if (g) grupos.add(g);
  });
  return grupos;
}

// O alimento do grupo que a criança mais vezes comeu tudo (null se nunca comeu tudo nenhum)
function alimentoAceito(refeicoes: Refeicao[], grupo: IdGrupo): string | null {
  const contagem = new Map<string, { nome: string; vezes: number }>();
  refeicoes.forEach((r) => {
    if (r.status !== 'completa') return;
    (r.alimentos || []).forEach((a) => {
      if (grupoDoAlimento(a.nome) !== grupo) return;
      const chave = a.nome.trim().toLowerCase();
      const atual = contagem.get(chave) ?? { nome: a.nome.trim(), vezes: 0 };
      atual.vezes++;
      contagem.set(chave, atual);
    });
  });
  const melhor = [...contagem.values()].sort((a, b) => b.vezes - a.vezes)[0];
  return melhor ? melhor.nome : null;
}

function montar(grupo: IdGrupo, motivo: MotivoSugestao, mensagem: string, nome: string, todas: Refeicao[]): SugestaoMeta {
  const info = GRUPOS[grupo];
  const aceito = alimentoAceito(todas, grupo);
  const alimento = aceito || ALIMENTO_PADRAO[grupo] || '';
  const titulo = `Comer ${alimento.toLowerCase()}`;
  const porque = aceito
    ? `${nome} já comeu tudo quando teve ${alimento.toLowerCase()}, então é um bom começo.`
    : `Se preferir, troque por outro alimento do grupo: ${info.exemplos.split(', ').filter((x) => x !== alimento.toLowerCase()).join(', ')}.`;
  return {
    tipo: 'alimento',
    id: `${grupo}-${motivo}`,
    grupo,
    motivo,
    mensagem,
    convite: `Que tal a meta "${titulo.toLowerCase()}" por ${DIAS_DA_META} dias? ${porque}`,
    alimento,
    titulo,
    descricao: `Meta sugerida pelo app: ${mensagem} ${porque}`,
    dias: DIAS_DA_META
  };
}

// metas: as metas da criança (não sugere um grupo que já tem meta de alimento em andamento)
// refeicoes: refeições dos últimos 30 dias (a análise usa as mais recentes; o resto serve para achar
//            o alimento do grupo que a criança já aceita)
export function sugerirMetas(refeicoes: Refeicao[], metas: Meta[], nome: string, agora: Date = new Date()): SugestaoMeta[] {
  const janela = refeicoesParaAnalise(refeicoes, agora);
  const n = janela.length;
  if (n < MIN_REFEICOES) return [];

  // grupos que já têm uma meta aberta (ex.: "Comer maçã" cobre frutas; "Ficar sem nugget" cobre ultraprocessados)
  const comMetaAberta = new Set(
    metas.filter((m) => (m.tipo === 'alimento' || m.tipo === 'ausencia') && !m.concluida).map((m) => grupoDoAlimento(m.alimento)).filter(Boolean)
  );
  const porRefeicao = janela.map((r) => ({ r, grupos: gruposDaRefeicao(r) }));
  const sugestoes: SugestaoMeta[] = [];

  for (const grupo of GRUPOS_DE_META) {
    if (comMetaAberta.has(grupo)) continue;
    const info = GRUPOS[grupo];
    const servidas = porRefeicao.filter((x) => x.grupos.has(grupo));
    // "não comeu" é o único status que conta como recusa; sem anotação conta como comeu
    const comidas = servidas.filter((x) => x.r.status !== 'nao_comeu');

    if (servidas.length === 0) {
      sugestoes.push(montar(grupo, 'nenhum', `${nome} não comeu ${info.nenhum} n${refeicoesTxt(n)}.`, nome, refeicoes));
    } else if (comidas.length === 0) {
      const vezes = servidas.length === 1 ? '1 vez' : `${servidas.length} vezes`;
      sugestoes.push(montar(grupo, 'recusou', `${info.nome} apareceram ${vezes} n${refeicoesTxt(n)}, mas ${nome} não comeu em nenhuma delas.`, nome, refeicoes));
    } else if (comidas.length === 1 && n >= 6) {
      sugestoes.push(montar(grupo, 'pouco', `${nome} comeu ${info.umItem} em só 1 d${refeicoesTxt(n)}.`, nome, refeicoes));
    }
  }

  // Muitos ultraprocessados: meta de AUSÊNCIA do que mais apareceu (só nesse caso o app sugere ausência)
  // só conta o que foi comido (refeição com "não comeu" fica de fora), igual ao Recado do Luca
  const comUltra = porRefeicao.filter((x) => x.grupos.has('ultraprocessados') && x.r.status !== 'nao_comeu');
  if (comUltra.length >= Math.max(3, Math.ceil(n * 0.4)) && !comMetaAberta.has('ultraprocessados')) {
    const vezes = new Map<string, { nome: string; vezes: number }>();
    comUltra.forEach(({ r }) => {
      (r.alimentos || []).forEach((a) => {
        if (grupoDoAlimento(a.nome) !== 'ultraprocessados') return;
        const chave = a.nome.trim().toLowerCase();
        const atual = vezes.get(chave) ?? { nome: a.nome.trim(), vezes: 0 };
        atual.vezes++;
        vezes.set(chave, atual);
      });
    });
    const maisComum = [...vezes.values()].sort((a, b) => b.vezes - a.vezes)[0];
    if (maisComum) {
      const alimento = maisComum.nome;
      const titulo = `Ficar sem ${alimento.toLowerCase()}`;
      const mensagem = `Ultraprocessados (como nugget, salsicha e linguiça) apareceram em ${comUltra.length} d${refeicoesTxt(n)} de ${nome}. O que mais apareceu foi ${alimento.toLowerCase()} (${maisComum.vezes === 1 ? '1 vez' : `${maisComum.vezes} vezes`}).`;
      const porque = `Cada dia sem ${alimento.toLowerCase()} conta para a meta. Uma boa troca é frango, carne ou ovo.`;
      sugestoes.push({
        tipo: 'ausencia',
        id: 'ultraprocessados-ausencia',
        grupo: 'ultraprocessados',
        motivo: 'ultraprocessados',
        mensagem,
        convite: `Que tal a meta de ausência "${titulo.toLowerCase()}" por ${DIAS_DA_META} dias? ${porque}`,
        alimento,
        titulo,
        descricao: `Meta sugerida pelo app: ${mensagem} ${porque}`,
        dias: DIAS_DA_META
      });
    }
  }

  return sugestoes.sort((a, b) => PRIORIDADE[a.motivo] - PRIORIDADE[b.motivo]).slice(0, 4);
}
