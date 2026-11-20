import type { Timestamp } from 'firebase/firestore';

// ---------- Refeições ----------
export const TIPOS_REFEICAO = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Janta'] as const;
export type TipoRefeicao = (typeof TIPOS_REFEICAO)[number];

export type StatusRefeicao = 'completa' | 'metade' | 'nao_comeu';

export interface Alimento {
  nome: string;
  icone?: string;
}

export interface Refeicao {
  id: string;
  responsavelId: string;
  filhoId: string;
  tipo: TipoRefeicao;
  alimentos: Alimento[];
  status?: StatusRefeicao;
  criadoEm?: Timestamp;
}

export interface AlimentoCatalogo {
  id: string;
  nome: string;
  categoria: string;
  icone: string;
  imagem?: string; // sprite do alimento (dos minijogos), quando existe
}

// ---------- Pequenos (filhos) ----------
export interface Filho {
  id: string;
  responsavelId: string;
  nome: string;
  dataNascimento?: string; // AAAA-MM-DD
  idade?: number | string; // cadastros antigos
  avatar?: string;
  cor?: string;
  xp?: number; // XP ganho nos minigames
  criadoEm?: Timestamp;
}

// O que fica guardado no sessionStorage como "pequeno ativo" (a criança aberta no momento)
export interface FilhoAtivo {
  id: string;
  nome: string;
  idade?: number | string;
  dataNascimento?: string;
  avatar?: string;
  cor?: string;
  xp?: number;
}

export interface Idade {
  anos: number;
  meses: number;
}

// ---------- Metas ----------
export type TipoMeta = 'simples' | 'refeicao' | 'alimento';

export interface Meta {
  id: string;
  responsavelId: string;
  filhoId: string;
  titulo: string;
  descricao?: string;
  cor?: string;
  recompensa?: string;
  tipo: TipoMeta;
  tiposRefeicao?: TipoRefeicao[];
  tipoRefeicao?: TipoRefeicao; // metas antigas (uma refeição só)
  alimento?: string;
  dias?: number;
  xpPorDia?: number;
  xpTotal?: number;
  diasCumpridos?: number;
  xpAtual?: number;
  xpConcedido?: number; // XP desta meta que já foi somado ao XP geral da criança (0 = ainda não)
  concluida: boolean;
  revisoes?: number;
  inicioEm?: Timestamp;
  criadoEm?: Timestamp;
}

export interface ProgressoMeta {
  diasCumpridos: number;
  xpAtual: number;
  concluida: boolean;
}

export interface PerdaMeta {
  titulo: string;
  diasAntes: number;
  diasDepois: number;
  total: number;
  reaberta: boolean;
}

export interface GanhoMeta {
  titulo: string;
  xp: number;
  concluida: boolean;
}

export interface ResultadoSincronizacao {
  metas: Meta[];
  ganhos: GanhoMeta[];
  perdas: PerdaMeta[];
  xpGeral: number; // XP que entrou (ou saiu, se negativo) do XP geral da criança por metas concluídas
}

// ---------- Partidas dos minigames (aba Desempenho) ----------
export type IdJogo = 'prato' | 'semaforo' | 'cesta';

export interface Partida {
  id: string;
  responsavelId: string;
  filhoId: string;
  jogo: IdJogo;
  jogoNome: string;
  estrelas: number; // 1 a 3
  resumo: string;   // ex.: "8 de 10 acertos"
  xp: number;       // XP ganho na partida
  narrador?: IdNarrador | null; // personagem que a criança escolheu
  detalhes?: DetalhesPartida | null; // partidas antigas não têm
  criadoEm?: Timestamp;
}

export type IdNarrador = 'alice' | 'luca';
export type CorSemaforo = 'verde' | 'amarelo' | 'vermelho';
export interface ItemCesta { id: string; nome: string; qtd: number }
export interface DetalhesCesta { tipo: 'cesta'; certos: ItemCesta[]; errados: ItemCesta[] }
export interface DetalhesPrato { tipo: 'prato'; divisoes: Array<{ secao: 'esq' | 'dirTop' | 'dirBot'; alimentos: Array<{ id: string; nome: string }> }> }
export interface DetalhesSemaforo { tipo: 'semaforo'; respostas: Array<{ id: string; nome: string; escolha: CorSemaforo; certa: CorSemaforo }> }
export type DetalhesPartida = DetalhesCesta | DetalhesPrato | DetalhesSemaforo;

// ---------- Notificações ----------
export type TipoNotificacao =
  | 'login'
  | 'meta_criada'
  | 'meta_dia_cumprido'
  | 'meta_atingida'
  | 'meta_progresso_revertido'
  | 'meta_prazo_proximo'
  | 'meta_prazo_encerrado';

export interface Notificacao {
  id: string;
  responsavelId: string;
  tipo: TipoNotificacao;
  titulo?: string;
  mensagem?: string;
  filhoId?: string;
  filhoNome?: string;
  metaId?: string;
  criadoEm?: Timestamp;
}

// Erros do Firebase trazem um `code`
export interface ErroComCodigo {
  code?: string;
  message?: string;
}
