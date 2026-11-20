// Leitura/gravação dos dados temporários que o app guarda no navegador entre as telas
import type { FilhoAtivo, Refeicao } from '../types';

function lerJSON<T>(storage: Storage, chave: string): T | null {
  try {
    const raw = storage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ---------- Pequeno ativo (a criança aberta na área dos pais) ----------
export function lerFilhoAtivo(): FilhoAtivo | null {
  return lerJSON<FilhoAtivo>(sessionStorage, 'filhoAtivo');
}
export function guardarFilhoAtivo(filho: FilhoAtivo): void {
  sessionStorage.setItem('filhoAtivo', JSON.stringify(filho));
}
export function limparFilhoAtivo(): void {
  sessionStorage.removeItem('filhoAtivo');
}

// ---------- Cadastro em andamento (nome + data, antes de escolher o personagem) ----------
export interface CadastroPendente {
  nome: string;
  dataNascimento: string;
}
export function lerCadastroPendente(): CadastroPendente | null {
  return lerJSON<CadastroPendente>(sessionStorage, 'pendingChild');
}
export function guardarCadastroPendente(dados: CadastroPendente): void {
  sessionStorage.setItem('pendingChild', JSON.stringify(dados));
}
export function limparCadastroPendente(): void {
  sessionStorage.removeItem('pendingChild');
}

// ---------- Edição de refeição / meta ----------
export function lerRefeicaoEmEdicao(): Refeicao | null {
  return lerJSON<Refeicao>(sessionStorage, 'refeicaoEdicao');
}
export function guardarRefeicaoEmEdicao(refeicao: Refeicao): void {
  sessionStorage.setItem('refeicaoEdicao', JSON.stringify(refeicao));
}
export function limparRefeicaoEmEdicao(): void {
  sessionStorage.removeItem('refeicaoEdicao');
}

export function lerMetaEdicaoId(): string | null {
  return sessionStorage.getItem('metaEdicaoId');
}
export function guardarMetaEdicaoId(id: string): void {
  sessionStorage.setItem('metaEdicaoId', id);
}
export function limparMetaEdicaoId(): void {
  sessionStorage.removeItem('metaEdicaoId');
}

// Meta sugerida pelo app (tela de metas -> formulário da meta de alimento já preenchido)
export interface MetaSugerida {
  alimento: string;
  titulo: string;
  descricao: string;
  dias: number;
  cor: string;
}
export function lerMetaSugerida(): MetaSugerida | null {
  return lerJSON<MetaSugerida>(sessionStorage, 'metaSugerida');
}
export function guardarMetaSugerida(dados: MetaSugerida): void {
  sessionStorage.setItem('metaSugerida', JSON.stringify(dados));
}
export function limparMetaSugerida(): void {
  sessionStorage.removeItem('metaSugerida');
}

// ---------- Perfil do responsável (a foto fica só neste aparelho) ----------
export function lerPerfilLocal(uid: string, campo: 'foto'): string | null {
  return localStorage.getItem(`perfil_${campo}_${uid}`);
}
export function guardarPerfilLocal(uid: string, campo: 'foto', valor: string | null): void {
  const chave = `perfil_${campo}_${uid}`;
  if (valor) localStorage.setItem(chave, valor);
  else localStorage.removeItem(chave);
}
