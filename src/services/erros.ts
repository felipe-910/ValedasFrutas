import type { ErroComCodigo } from '../types';

// Pega o `code` de um erro do Firebase (ou undefined, se não houver)
export function codigoDoErro(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null ? (err as ErroComCodigo).code : undefined;
}

export function mensagemDoErro(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null ? (err as ErroComCodigo).message : undefined;
}
