// Controla a aceitação da Política de Privacidade por usuário (salvo localmente no aparelho,
// para não depender de regras extras do Firestore).
// VERSAO sobe quando o texto muda de forma relevante: quem aceitou a versão antiga aceita de novo.
const VERSAO = '2'; // 2 = Política de Privacidade e Proteção de Dados (Petalplay)
import { auth } from '../firebase';

function chaveTermos(uid: string): string {
  return `termos_aceitos_${uid}`;
}

// Verifica se o usuário logado já aceitou os termos vigentes
export async function termosAceitos(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  return localStorage.getItem(chaveTermos(user.uid)) === VERSAO;
}

// Registra o aceite dos termos para o usuário logado
export async function aceitarTermos(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  localStorage.setItem(chaveTermos(user.uid), VERSAO);
}
