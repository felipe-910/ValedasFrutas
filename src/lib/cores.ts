// Paleta usada para escolher a cor do pequeno (configurações) e da meta
export interface CorOpcao {
  hex: string;
  nome: string;
}

export const CORES_PEQUENO: CorOpcao[] = [
  { hex: '#f2726c', nome: 'Vermelho' },
  { hex: '#f4a53b', nome: 'Laranja' },
  { hex: '#f7d55e', nome: 'Amarelo' },
  { hex: '#6fa981', nome: 'Verde' },
  { hex: '#5b5ea6', nome: 'Azul' },
  { hex: '#b0699e', nome: 'Roxo' },
  { hex: '#9cd1e0', nome: 'Azul claro' },
  { hex: '#f2a6a2', nome: 'Rosa' },
  { hex: '#e6c199', nome: 'Bege' },
  { hex: '#f7e6a3', nome: 'Amarelo claro' },
  { hex: '#9bc7a0', nome: 'Verde claro' },
  { hex: '#9098cc', nome: 'Roxo claro' },
  { hex: '#dcb3d9', nome: 'Lilás' },
  { hex: '#bfe3e8', nome: 'Ciano claro' }
];

// As metas têm a mesma paleta, só que terminam em branco em vez de ciano claro
export const CORES_META: CorOpcao[] = [
  ...CORES_PEQUENO.filter((c) => c.hex !== '#bfe3e8'),
  { hex: '#ffffff', nome: 'Branco' }
];

// Cores de fundo alternadas dos cards dos pequenos na home
export const CORES_CARD_HOME = ['#6fa981', '#9098cc'];

// Decide se o título deve ficar escuro (cor de fundo clara) ou claro
export function corEhClara(hex: string | undefined): boolean {
  const h = (hex || '#6fa981').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.75;
}

// Cor da borda do card do pequeno: o mesmo tom da cor de fundo, só que mais escuro e um pouco mais forte
export function corDaBorda(hex: string | undefined): string {
  const h = (hex || '#6fa981').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let tom = 0;
  let sat = 0;
  if (d > 0) {
    sat = d / (1 - Math.abs(2 * l - 1));
    if (max === r) tom = ((g - b) / d) % 6;
    else if (max === g) tom = (b - r) / d + 2;
    else tom = (r - g) / d + 4;
    tom *= 60;
    if (tom < 0) tom += 360;
  }
  const novaL = Math.max(0.2, l - 0.18);
  const novaS = Math.min(1, sat * 0.8);
  const c = (1 - Math.abs(2 * novaL - 1)) * novaS;
  const x = c * (1 - Math.abs(((tom / 60) % 2) - 1));
  const m = novaL - c / 2;
  const [r1, g1, b1] =
    tom < 60 ? [c, x, 0] : tom < 120 ? [x, c, 0] : tom < 180 ? [0, c, x] : tom < 240 ? [0, x, c] : tom < 300 ? [x, 0, c] : [c, 0, x];
  const paraHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${paraHex(r1)}${paraHex(g1)}${paraHex(b1)}`;
}
