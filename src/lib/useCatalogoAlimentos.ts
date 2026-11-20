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

export const ICONE_ALIMENTO_PADRAO = 'game-icons:meal';

// Ícone a mostrar para um alimento: o do catálogo (pelo nome) tem prioridade, assim refeições
// salvas antes da troca de ícones também aparecem com os ícones novos.
export function iconeDoAlimento(catalogo: AlimentoCatalogo[], nome: string, iconeSalvo?: string): string {
  const achado = catalogo.find((f) => f.nome.toLowerCase() === nome.trim().toLowerCase());
  return achado?.icone || iconeSalvo || ICONE_ALIMENTO_PADRAO;
}
