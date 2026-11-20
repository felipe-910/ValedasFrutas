// Histórico das partidas dos minigames (aparece na aba "Desempenho" de cada pequeno)
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { DetalhesPartida, IdJogo, IdNarrador, Partida } from '../types';

const COLECAO = 'partidas';

export const NOMES_JOGOS: Record<IdJogo, string> = {
  prato: 'Monte seu prato',
  semaforo: 'Semáforo Saudável',
  cesta: 'Cesta Saudável'
};

export interface DadosPartida {
  filhoId: string;
  jogo: IdJogo;
  estrelas: number;
  resumo: string;
  xp: number;
  narrador?: IdNarrador | null;
  detalhes?: DetalhesPartida | null;
}

// CREATE - guarda uma partida terminada (a data e a hora vêm do servidor)
export async function registrarPartida({ filhoId, jogo, estrelas, resumo, xp, narrador, detalhes }: DadosPartida): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await addDoc(collection(db, COLECAO), {
    responsavelId: user.uid,
    filhoId,
    jogo,
    jogoNome: NOMES_JOGOS[jogo] ?? jogo,
    estrelas: Math.min(3, Math.max(1, Math.round(estrelas) || 1)),
    resumo: resumo.slice(0, 160),
    xp,
    narrador: narrador ?? null,
    detalhes: detalhes ?? null,
    criadoEm: serverTimestamp()
  });
}

// READ - todas as partidas de um pequeno (a ordem é escolhida na tela)
export async function listarPartidas(filhoId: string): Promise<Partida[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, COLECAO), where('filhoId', '==', filhoId), where('responsavelId', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Partida);
}
