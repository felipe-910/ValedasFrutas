import type { TipoRefeicao } from '../types';

// Classe CSS de cada tipo de refeição (define cores e ícone, veja .meal-* no style.css)
export const CLASSE_TIPO: Record<TipoRefeicao, string> = {
  'Café da manhã': 'meal-cafe',
  'Lanche da manhã': 'meal-lanche-manha',
  'Almoço': 'meal-almoco',
  'Lanche da tarde': 'meal-lanche-tarde',
  'Janta': 'meal-janta'
};
