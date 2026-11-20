import { useCallback, useState } from 'react';
import { guardarFilhoAtivo, lerFilhoAtivo } from './sessao';
import type { FilhoAtivo } from '../types';

// O pequeno que está aberto na área dos pais (guardado no sessionStorage pela home).
// Devolve null se ninguém foi escolhido: a tela deve mandar de volta para /home.
// Ao trocar o valor com `atualizar`, ele também é guardado de novo.
export function useFilhoAtivo(): [FilhoAtivo | null, (filho: FilhoAtivo) => void] {
  const [filho, setFilho] = useState<FilhoAtivo | null>(() => lerFilhoAtivo());

  const atualizar = useCallback((novo: FilhoAtivo) => {
    guardarFilhoAtivo(novo);
    setFilho(novo);
  }, []);

  return [filho, atualizar];
}
