// Tutorial da Alice: o que cada responsável já viu fica guardado na conta dele (Firestore, coleção
// "responsaveis", documento = uid), então vale em qualquer celular ou computador.
// Se o Firebase recusar (regras novas ainda não publicadas) ou estiver sem internet, usa a cópia guardada
// neste aparelho, para o app nunca travar por causa do tutorial.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TutorialConta {
  mostrar: boolean; // os tutoriais ainda não vistos aparecem sozinhos (conta nova, ou pediu pelo menu)
  obrigatorio: boolean; // primeiro acesso da conta: sem o botão de pular
  vistos: Record<string, boolean>; // 'geral', 'painel', 'metas'...
  em?: number; // quando foi salvo (para saber qual cópia é a mais nova)
}

// contas que já existiam antes do tutorial: ele só aparece se a pessoa pedir pelo menu
export const SEM_TUTORIAL: TutorialConta = { mostrar: false, obrigatorio: false, vistos: {} };

const chaveLocal = (uid: string) => `tutorial_conta_${uid}`;
function lerLocal(uid: string): TutorialConta | null {
  try {
    const texto = localStorage.getItem(chaveLocal(uid));
    return texto ? (JSON.parse(texto) as TutorialConta) : null;
  } catch {
    return null;
  }
}
function salvarLocal(uid: string, t: TutorialConta): void {
  try {
    localStorage.setItem(chaveLocal(uid), JSON.stringify(t));
  } catch {
    /* sem armazenamento: tudo bem */
  }
}

export async function lerTutorialConta(uid: string): Promise<TutorialConta> {
  const local = lerLocal(uid);
  let daConta: TutorialConta | null = null;
  try {
    const snap = await getDoc(doc(db, 'responsaveis', uid));
    daConta = snap.exists() ? ((snap.data().tutorial as TutorialConta | undefined) ?? null) : null;
  } catch (err) {
    console.warn('Tutorial: usando o que está salvo neste aparelho.', err);
  }
  // fica a cópia mais nova (a do aparelho pode ter sido salva sem internet)
  const escolhido = daConta && local ? ((local.em ?? 0) > (daConta.em ?? 0) ? local : daConta) : daConta ?? local;
  return escolhido ? { ...SEM_TUTORIAL, ...escolhido, vistos: { ...(escolhido.vistos ?? {}) } } : SEM_TUTORIAL;
}

export async function salvarTutorialConta(uid: string, t: TutorialConta): Promise<void> {
  const comData = { ...t, em: Date.now() };
  salvarLocal(uid, comData);
  try {
    await setDoc(doc(db, 'responsaveis', uid), { tutorial: comData }, { merge: true });
  } catch (err) {
    console.warn('Tutorial: não deu para salvar na conta; ficou salvo neste aparelho.', err);
  }
}

// A conta acabou de ser criada: no primeiro acesso o tutorial aparece sozinho e é obrigatório
export async function marcarContaNova(uid: string): Promise<void> {
  await salvarTutorialConta(uid, { mostrar: true, obrigatorio: true, vistos: {} });
}
