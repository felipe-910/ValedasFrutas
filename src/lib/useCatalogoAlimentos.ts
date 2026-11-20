import { useEffect, useState } from 'react';
import type { AlimentoCatalogo } from '../types';

let cache: AlimentoCatalogo[] | null = null;

// Carrega o catálogo de alimentos (com ícones) do alimentos.json, uma vez só
export function useCatalogoAlimentos(): AlimentoCatalogo[] {
  const [catalogo, setCatalogo] = useState<AlimentoCatalogo[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let ativo = true;
    fetch('/alimentos.json')
      .then((r) => r.json() as Promise<AlimentoCatalogo[]>)
      .then((dados) => {
        cache = dados;
        if (ativo) setCatalogo(dados);
      })
      .catch(() => { if (ativo) setCatalogo([]); });
    return () => { ativo = false; };
  }, []);

  return catalogo;
}
