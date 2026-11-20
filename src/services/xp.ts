// XP do pequeno: fica no campo `xp` do documento dele (coleção "filhos").
// O XP geral vem de duas fontes: minigames (ganharXp) e metas concluídas (sincronizarXpDaMeta).
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { guardarFilhoAtivo, lerFilhoAtivo } from '../lib/sessao';
import { xpTotalDaMeta } from './progressoMeta';
import type { Meta } from '../types';

// mantém o "pequeno ativo" guardado no navegador em dia, para o perfil mostrar o nível novo
function atualizarFilhoAtivo(filhoId: string, xp: number): void {
  const ativo = lerFilhoAtivo();
  if (ativo && ativo.id === filhoId) guardarFilhoAtivo({ ...ativo, xp });
}

// Soma XP ao pequeno e devolve o total antes e depois (para saber se subiu de nível).
export async function ganharXp(filhoId: string, quantidade: number): Promise<{ xpAntes: number; xpDepois: number }> {
  const ref = doc(db, 'filhos', filhoId);
  const resultado = await runTransaction(db, async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('Pequeno não encontrado.');
    const atual = snap.data().xp;
    const xpAntes = typeof atual === 'number' ? atual : 0;
    const xpDepois = xpAntes + quantidade;
    t.update(ref, { xp: xpDepois });
    return { xpAntes, xpDepois };
  });
  atualizarFilhoAtivo(filhoId, resultado.xpDepois);
  return resultado;
}

export interface AjusteXpMeta {
  delta: number;    // quanto o XP geral mudou (positivo = ganhou, negativo = perdeu)
  xpAntes: number;
  xpDepois: number;
}

// Deixa o XP geral da criança em dia com UMA meta:
//  - meta concluída  -> o XP total dela fica somado ao XP geral (uma única vez);
//  - meta reaberta   -> o XP que ela tinha dado é devolvido.
// Tudo acontece numa transação lendo a meta e a criança juntas, e o que já foi somado fica
// guardado na própria meta (`xpConcedido`). Por isso chamar duas vezes (ou em duas telas ao
// mesmo tempo) nunca soma em dobro. Devolve null quando não havia nada a ajustar.
export async function sincronizarXpDaMeta(metaId: string): Promise<AjusteXpMeta | null> {
  const metaRef = doc(db, 'metas', metaId);
  const resultado = await runTransaction(db, async (t) => {
    const metaSnap = await t.get(metaRef);
    if (!metaSnap.exists()) return null;
    const meta = { id: metaSnap.id, ...metaSnap.data() } as Meta;
    if (!meta.filhoId) return null;

    const desejado = meta.concluida ? xpTotalDaMeta(meta) : 0;
    const concedido = typeof meta.xpConcedido === 'number' ? meta.xpConcedido : 0;
    const delta = desejado - concedido;
    if (delta === 0) return null;

    const filhoRef = doc(db, 'filhos', meta.filhoId);
    const filhoSnap = await t.get(filhoRef);
    if (!filhoSnap.exists()) return null;
    const atual = filhoSnap.data().xp;
    const xpAntes = typeof atual === 'number' ? atual : 0;
    const xpDepois = Math.max(0, xpAntes + delta);
    t.update(filhoRef, { xp: xpDepois });
    t.update(metaRef, { xpConcedido: desejado });
    return { filhoId: meta.filhoId, delta, xpAntes, xpDepois };
  });
  if (!resultado) return null;
  atualizarFilhoAtivo(resultado.filhoId, resultado.xpDepois);
  return { delta: resultado.delta, xpAntes: resultado.xpAntes, xpDepois: resultado.xpDepois };
}
