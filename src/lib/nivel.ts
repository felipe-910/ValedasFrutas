// Regras de XP e nível do pequeno. Para mudar o ritmo do jogo, é só mexer nestes números.

// Quanto XP falta para subir de nível (a barra do perfil mostra "xp/500pts")
export const XP_POR_NIVEL = 500;

// XP que um minigame dá ao ser finalizado, conforme as estrelas do resultado (1, 2 ou 3)
export const XP_POR_ESTRELAS: Record<number, number> = { 1: 50, 2: 75, 3: 100 };

export function xpDoJogo(estrelas: number): number {
  const e = Math.min(3, Math.max(1, Math.round(estrelas) || 1));
  return XP_POR_ESTRELAS[e];
}

export interface NivelInfo {
  nivel: number;       // 1, 2, 3...
  xpNoNivel: number;   // XP dentro do nível atual (0 a XP_POR_NIVEL - 1)
  xpPorNivel: number;
  porcento: number;    // preenchimento da barra (0 a 100)
}

export function calcularNivel(xpTotal: number | undefined): NivelInfo {
  const xp = Math.max(0, Math.floor(Number(xpTotal) || 0));
  const xpNoNivel = xp % XP_POR_NIVEL;
  return {
    nivel: Math.floor(xp / XP_POR_NIVEL) + 1,
    xpNoNivel,
    xpPorNivel: XP_POR_NIVEL,
    porcento: (xpNoNivel / XP_POR_NIVEL) * 100
  };
}
