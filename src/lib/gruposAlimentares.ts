// Grupos alimentares usados nas sugestões de metas (para ver o que faltou nas refeições).
// A classificação é pelo nome do alimento (sem acento, minúsculo), então vale também para
// refeições antigas e para alimentos que não estão mais no catálogo.

// sem acento e minúsculo (igual ao normalizar de progressoMeta; repetido aqui para não criar import circular)
function normalizar(texto: string | undefined): string {
  return (texto || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

export type IdGrupo = 'frutas' | 'verduras' | 'proteinas' | 'cereais' | 'laticinios' | 'ultraprocessados';

export interface InfoGrupo {
  nome: string; // "Frutas"
  umItem: string; // "uma fruta" (para frases: "não comeu nenhuma fruta")
  nenhum: string; // "nenhuma fruta"
  exemplos: string; // texto curto com exemplos
  cor: string; // cor da meta criada a partir da sugestão
}

export const GRUPOS: Record<IdGrupo, InfoGrupo> = {
  frutas: { nome: 'Frutas', umItem: 'uma fruta', nenhum: 'nenhuma fruta', exemplos: 'banana, maçã, uva, laranja, abacaxi, melancia', cor: '#f2726c' },
  verduras: { nome: 'Verduras e legumes', umItem: 'uma verdura ou legume', nenhum: 'nenhuma verdura ou legume', exemplos: 'cenoura, abóbora, chuchu, tomate', cor: '#6fa981' },
  proteinas: { nome: 'Proteínas', umItem: 'uma proteína', nenhum: 'nenhuma proteína', exemplos: 'frango, carne, ovo, feijão', cor: '#f4a53b' },
  cereais: { nome: 'Cereais e tubérculos', umItem: 'um cereal ou tubérculo', nenhum: 'nenhum cereal ou tubérculo', exemplos: 'arroz, pão, macarrão, batata, milho', cor: '#e6c199' },
  laticinios: { nome: 'Leite e derivados', umItem: 'um laticínio', nenhum: 'nenhum laticínio', exemplos: 'queijo, leite, iogurte', cor: '#9cd1e0' },
  ultraprocessados: { nome: 'Ultraprocessados', umItem: 'um ultraprocessado', nenhum: 'nenhum ultraprocessado', exemplos: 'nugget, salsicha, linguiça', cor: '#b0699e' }
};

// Grupos que o app confere nas refeições para sugerir metas. Ultraprocessados à parte: a ideia é comer menos deles.
export const GRUPOS_DE_META: IdGrupo[] = ['frutas', 'verduras', 'proteinas'];

// Alimento sugerido quando a criança ainda não comeu nada do grupo (todos estão no catálogo, com sprite)
export const ALIMENTO_PADRAO: Partial<Record<IdGrupo, string>> = { frutas: 'Banana', verduras: 'Cenoura', proteinas: 'Frango' };

// Alimentos de cada grupo. Nugget, salsicha e linguiça ficam em ultraprocessados (não contam como proteína).
const ALIMENTOS: Record<IdGrupo, string[]> = {
  frutas: ['banana', 'maca', 'uva', 'laranja', 'abacaxi', 'melancia', 'pera', 'mamao', 'manga', 'morango', 'melao', 'kiwi', 'goiaba', 'tangerina', 'mexerica', 'limao', 'abacate', 'caqui', 'ameixa', 'pessego'],
  verduras: ['cenoura', 'abobora', 'chuchu', 'tomate', 'salada', 'alface', 'brocolis', 'couve', 'agriao', 'beterraba', 'pepino', 'abobrinha', 'vagem', 'espinafre', 'repolho', 'couve-flor', 'couve flor', 'berinjela', 'quiabo', 'pimentao', 'rucula'],
  proteinas: ['ovo', 'frango', 'carne', 'bife', 'peixe', 'feijao', 'lentilha', 'grao de bico', 'grao-de-bico', 'ervilha', 'carne moida', 'file de frango', 'atum', 'sardinha'],
  cereais: ['pao', 'arroz', 'batata', 'milho', 'macarrao', 'mandioca', 'aipim', 'macaxeira', 'cuscuz', 'aveia', 'tapioca', 'batata doce', 'inhame', 'pipoca'],
  laticinios: ['queijo', 'leite', 'iogurte', 'requeijao'],
  ultraprocessados: ['nugget', 'nuggets', 'salsicha', 'linguica', 'hamburguer', 'refri', 'refrigerante', 'biscoito', 'bolacha', 'bombom', 'doce', 'salgadinho', 'batata frita', 'presunto', 'mortadela', 'chocolate', 'bala', 'pirulito']
};

const MAPA = new Map<string, IdGrupo>();
(Object.keys(ALIMENTOS) as IdGrupo[]).forEach((g) => ALIMENTOS[g].forEach((nome) => MAPA.set(nome, g)));

// Grupo de um alimento pelo nome ("Maçã" -> frutas). Alimento desconhecido -> null.
export function grupoDoAlimento(nome: string | undefined): IdGrupo | null {
  const chave = normalizar(nome);
  if (!chave) return null;
  if (MAPA.has(chave)) return MAPA.get(chave)!;
  // plural simples ("bananas", "ovos")
  if (chave.endsWith('s') && MAPA.has(chave.slice(0, -1))) return MAPA.get(chave.slice(0, -1))!;
  return null;
}
