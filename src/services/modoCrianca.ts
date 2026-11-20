// "Modo criança": enquanto estiver ativo, o app só mostra a tela de histórias.
// Para voltar à área dos pais é preciso digitar a senha (veja components/SenhaModal).
// O estado fica no localStorage, então continua valendo se a aba for fechada e reaberta.
// A trava das outras telas está em components/ModoCriancaGuard (usa a mesma chave).
import type { FilhoAtivo } from '../types';
import { guardarFilhoAtivo } from '../lib/sessao';

export const CHAVE_MODO_CRIANCA = 'modoCrianca';

export interface ModoCrianca {
  uid: string;
  filhoId: string;
  nome: string;
}

// Liga o modo criança para um pequeno. `filho` é o mesmo objeto guardado como pequeno ativo.
export function iniciarModoCrianca(uid: string, filho: FilhoAtivo): void {
  const modo: ModoCrianca = { uid, filhoId: filho.id, nome: filho.nome };
  localStorage.setItem(CHAVE_MODO_CRIANCA, JSON.stringify(modo));
  guardarFilhoAtivo(filho);
}

// { uid, filhoId, nome } ou null, se o modo criança não estiver ativo
export function lerModoCrianca(): ModoCrianca | null {
  try {
    const raw = localStorage.getItem(CHAVE_MODO_CRIANCA);
    return raw ? (JSON.parse(raw) as ModoCrianca) || null : null;
  } catch {
    return null;
  }
}

export function sairModoCrianca(): void {
  localStorage.removeItem(CHAVE_MODO_CRIANCA);
}
