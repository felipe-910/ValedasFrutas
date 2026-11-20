// Recado sobre a alimentação: um resumo de como a criança comeu nos ÚLTIMOS 7 DIAS
// (hoje e os 6 dias antes), feito a partir das refeições registradas. Só cálculo, sem Firebase.
// Quem fala é o personagem da criança: o Luca (avatar 1) ou a Alice (avatar 2).
//
// O recado tem: uma frase de abertura, o que está indo bem e o que merece atenção.
// Arroz e feijão têm um aviso próprio quando faltam (a dupla é a base do prato brasileiro).
import { paraData } from './tempo';
import { grupoDoAlimento } from './gruposAlimentares';
import type { IdGrupo } from './gruposAlimentares';
import type { Refeicao } from '../types';

export const DIAS_DO_RECADO = 7;
const MIN_PARA_AVALIAR = 3; // com menos refeições, o personagem só pede mais registros

export type ClimaRecado = 'otimo' | 'bom' | 'atencao' | 'sem_dados';

export type Narrador = 'luca' | 'alice';

// O personagem que a criança escolheu no cadastro: avatar 2 é a Alice; o resto (avatar 1 ou sem avatar), o Luca
export function narradorDoAvatar(avatar: string | number | undefined): Narrador {
  return String(avatar) === '2' ? 'alice' : 'luca';
}

export interface RecadoAlimentacao {
  clima: ClimaRecado;
  rotuloClima: string; // "Semana ótima!", "Semana boa", "Dá para melhorar"
  abertura: string;
  positivos: string[];
  atencao: string[];
  pctComeuTudo: number | null; // % de "comeu tudo" nas refeições anotadas
  refeicoes: number; // quantas refeições entraram
  dias: number; // em quantos dos 7 dias houve registro
}

function normalizar(texto: string | undefined): string {
  return (texto || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

const vezesTxt = (n: number) => `${n} ${n === 1 ? 'vez' : 'vezes'}`;
const refeicoesTxt = (n: number) => `${n} ${n === 1 ? 'refeição' : 'refeições'}`;

export function refeicoesDosUltimos7Dias(refeicoes: Refeicao[], agora: Date = new Date()): Refeicao[] {
  const desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (DIAS_DO_RECADO - 1)).getTime();
  return refeicoes.filter((r) => (paraData(r.criadoEm) ?? agora).getTime() >= desde);
}

// "comeu" = qualquer status menos "não comeu" (sem anotação conta como comeu)
const comeu = (r: Refeicao) => r.status !== 'nao_comeu';

export function gerarRecado(todas: Refeicao[], nome: string, narrador: Narrador, agora: Date = new Date()): RecadoAlimentacao {
  const oi = narrador === 'alice' ? 'Oi! Eu sou a Alice.' : 'Oi! Eu sou o Luca.';
  const lista = refeicoesDosUltimos7Dias(todas, agora);
  const n = lista.length;
  const dias = new Set(lista.map((r) => {
    const d = paraData(r.criadoEm) ?? agora;
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;

  if (n === 0) {
    return {
      clima: 'sem_dados', rotuloClima: 'Sem refeições', refeicoes: 0, dias: 0, positivos: [], atencao: [], pctComeuTudo: null,
      abertura: `${oi} Ainda não tem nenhuma refeição de ${nome} registrada nos últimos 7 dias. Registre as refeições e eu conto aqui como está a alimentação!`
    };
  }
  if (n < MIN_PARA_AVALIAR) {
    return {
      clima: 'sem_dados', rotuloClima: 'Poucas refeições', refeicoes: n, dias, positivos: [], atencao: [], pctComeuTudo: null,
      abertura: `${oi} Nos últimos 7 dias só ${n === 1 ? 'tem 1 refeição registrada' : `tem ${n} refeições registradas`} de ${nome}. Com pelo menos ${MIN_PARA_AVALIAR} eu já consigo dizer como está a alimentação!`
    };
  }

  // ---------- contas ----------
  const comStatus = lista.filter((r) => r.status);
  const completas = comStatus.filter((r) => r.status === 'completa').length;
  const naoComeu = comStatus.filter((r) => r.status === 'nao_comeu').length;
  const pctCompleta = comStatus.length ? Math.round((completas / comStatus.length) * 100) : null;
  const pctNaoComeu = comStatus.length ? Math.round((naoComeu / comStatus.length) * 100) : 0;

  // em quantas refeições cada grupo foi comido
  const porGrupo: Record<IdGrupo, number> = { frutas: 0, verduras: 0, proteinas: 0, cereais: 0, laticinios: 0, ultraprocessados: 0 };
  const ultraVezes = new Map<string, { nome: string; vezes: number }>();
  let comArroz = 0;
  let comFeijao = 0;
  let comADupla = 0;
  lista.forEach((r) => {
    if (!comeu(r)) return;
    const grupos = new Set<IdGrupo>();
    let arroz = false;
    let feijao = false;
    (r.alimentos || []).forEach((a) => {
      const g = grupoDoAlimento(a.nome);
      if (g) grupos.add(g);
      const chave = normalizar(a.nome);
      if (chave === 'arroz') arroz = true;
      if (chave === 'feijao') feijao = true;
      if (g === 'ultraprocessados') {
        const atual = ultraVezes.get(chave) ?? { nome: a.nome.trim().toLowerCase(), vezes: 0 };
        atual.vezes++;
        ultraVezes.set(chave, atual);
      }
    });
    grupos.forEach((g) => { porGrupo[g]++; });
    if (arroz) comArroz++;
    if (feijao) comFeijao++;
    if (arroz && feijao) comADupla++;
  });

  // alimentos recusados mais vezes
  const recusas = new Map<string, { nome: string; vezes: number }>();
  lista.filter((r) => r.status === 'nao_comeu').forEach((r) => {
    (r.alimentos || []).forEach((a) => {
      const chave = normalizar(a.nome);
      const atual = recusas.get(chave) ?? { nome: a.nome.trim().toLowerCase(), vezes: 0 };
      atual.vezes++;
      recusas.set(chave, atual);
    });
  });
  const maisRecusado = [...recusas.values()].sort((a, b) => b.vezes - a.vezes)[0];
  const ultraTotal = porGrupo.ultraprocessados;
  const ultraMaisComum = [...ultraVezes.values()].sort((a, b) => b.vezes - a.vezes)[0];

  // ---------- frases ----------
  const positivos: string[] = [];
  const atencao: string[] = [];

  if (pctCompleta !== null && pctCompleta >= 60) positivos.push(`${nome} comeu tudo em ${pctCompleta}% das refeições anotadas. Mandou bem!`);
  if (porGrupo.frutas >= 4) positivos.push(`Teve fruta em ${refeicoesTxt(porGrupo.frutas)}. Frutas dão vitaminas e energia para brincar!`);
  if (porGrupo.verduras >= 4) positivos.push(`Verduras e legumes apareceram em ${refeicoesTxt(porGrupo.verduras)}. Muito bom!`);
  if (porGrupo.proteinas >= 4) positivos.push(`Proteína (frango, carne, ovo ou feijão) esteve em ${refeicoesTxt(porGrupo.proteinas)}. Ajuda a crescer forte!`);
  if (comADupla >= 3) positivos.push(`Arroz com feijão apareceu ${vezesTxt(comADupla)}. Essa dupla é campeã!`);
  if (ultraTotal === 0 && n >= 5) positivos.push('Nenhum ultraprocessado (nugget, salsicha, linguiça) na semana. Parabéns!');
  if (dias === DIAS_DO_RECADO) positivos.push('Vocês registraram refeições em todos os 7 dias. Assim eu consigo ajudar muito mais!');

  // Arroz e feijão: aviso próprio quando falta um deles ou os dois
  if (comArroz === 0 && comFeijao === 0) {
    atencao.push('Não vi arroz nem feijão nesta semana. Juntos, eles são a base do prato brasileiro: dão energia, proteína e ferro. Que tal colocar a dupla no almoço ou na janta?');
  } else if (comFeijao === 0) {
    atencao.push(`Teve arroz (${vezesTxt(comArroz)}), mas não vi feijão nesta semana. O feijão tem ferro e proteína, e com o arroz fica ainda mais completo.`);
  } else if (comArroz === 0) {
    atencao.push(`Teve feijão (${vezesTxt(comFeijao)}), mas não vi arroz nesta semana. Arroz com feijão juntos formam uma combinação muito nutritiva.`);
  }

  if (ultraTotal >= 3 || (n >= 5 && ultraTotal / n >= 0.3)) {
    atencao.push(`Ultraprocessados apareceram em ${refeicoesTxt(ultraTotal)}${ultraMaisComum ? ` (o que mais apareceu foi ${ultraMaisComum.nome})` : ''}. Em Metas, a meta de ausência ajuda a diminuir.`);
  }

  if (porGrupo.frutas === 0) atencao.push(`Nenhuma fruta nos últimos 7 dias. Banana, maçã ou laranja no lanche são um ótimo começo.`);
  else if (porGrupo.frutas <= 2 && n >= 6) atencao.push(`Fruta apareceu em só ${refeicoesTxt(porGrupo.frutas)}. Dá para colocar mais nos lanches.`);

  if (porGrupo.verduras === 0) atencao.push(`Não vi verduras nem legumes nesta semana. Cenoura, abóbora, tomate ou chuchu no prato fazem diferença.`);
  else if (porGrupo.verduras <= 2 && n >= 6) atencao.push(`Verduras e legumes apareceram em só ${refeicoesTxt(porGrupo.verduras)}.`);

  if (porGrupo.proteinas === 0) atencao.push('Nenhuma proteína (frango, carne, ovo ou feijão) na semana. Ela é importante para crescer forte.');

  if (comStatus.length >= 3 && pctNaoComeu >= 40) {
    atencao.push(`${nome} não comeu em ${pctNaoComeu}% das refeições anotadas. Vale ver se está com fome nos horários das refeições.`);
  }
  if (maisRecusado && maisRecusado.vezes >= 2) {
    atencao.push(`${nome} recusou ${maisRecusado.nome} ${vezesTxt(maisRecusado.vezes)}. Tente oferecer de outro jeito (em pedacinhos, assado, junto com algo que ${nome} gosta).`);
  }

  // ---------- clima ----------
  const pontos = positivos.length - atencao.length;
  const clima: ClimaRecado = atencao.length === 0 && positivos.length >= 2 ? 'otimo' : pontos >= 0 ? 'bom' : 'atencao';
  const rotuloClima = clima === 'otimo' ? 'Semana ótima!' : clima === 'bom' ? 'Semana boa' : 'Dá para melhorar';

  const abertura = clima === 'otimo'
    ? `${oi} Olhei as ${refeicoesTxt(n)} de ${nome} dos últimos 7 dias e a alimentação está ótima!`
    : clima === 'bom'
      ? `${oi} Olhei as ${refeicoesTxt(n)} de ${nome} dos últimos 7 dias. Tem bastante coisa boa e alguns pontos para cuidar.`
      : `${oi} Olhei as ${refeicoesTxt(n)} de ${nome} dos últimos 7 dias. Separei alguns pontos para melhorar juntos.`;

  return { clima, rotuloClima, abertura, positivos: positivos.slice(0, 4), atencao: atencao.slice(0, 5), refeicoes: n, dias, pctComeuTudo: pctCompleta };
}
