// CRUD dos "pequenos" (filhos) cadastrados por cada responsável, no Firestore
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { termosAceitos } from './termos';
import { calcularIdade } from '../lib/idade';
import type { Filho } from '../types';

const COLECAO = 'filhos';

// CREATE - cadastra um novo pequeno vinculado ao responsável logado
// Guarda a data de nascimento (AAAA-MM-DD); a idade é sempre calculada na hora de mostrar.
export async function addFilho({ nome, dataNascimento, avatar }: { nome: string; dataNascimento: string; avatar: string }): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  if (!calcularIdade(dataNascimento)) throw new Error('Data de nascimento inválida.');
  await addDoc(collection(db, COLECAO), {
    responsavelId: user.uid,
    nome,
    dataNascimento,
    avatar,
    criadoEm: serverTimestamp()
  });
}

// READ - lista todos os pequenos do responsável logado
export async function listarFilhos(): Promise<Filho[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, COLECAO), where('responsavelId', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Filho);
}

// UPDATE - atualiza dados de um pequeno (ex: cor principal)
export async function updateFilho(id: string, dados: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), dados);
}

// DELETE - remove o cadastro de um pequeno
export async function deleteFilho(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id));
}

// Decide para onde mandar o responsável depois do login (devolve o caminho da rota):
// se é a primeira vez (ainda não aceitou a Política de Privacidade) -> tela de aceite (/aceitar-termos)
// se ainda não tem nenhum pequeno cadastrado -> onboarding (/novo-pequeno)
// se já tem -> vai direto pra /home
export async function destinoAposLogin(): Promise<string> {
  let aceitouTermos = true;
  try {
    aceitouTermos = await termosAceitos();
  } catch (err) {
    // Nunca deixa um erro aqui travar o login do usuário
    console.error('Falha ao verificar a Política de Privacidade:', err);
    aceitouTermos = true;
  }
  if (!aceitouTermos) return '/aceitar-termos';

  try {
    const filhos = await listarFilhos();
    return filhos.length > 0 ? '/home' : '/novo-pequeno';
  } catch (err) {
    console.error('Falha ao carregar os pequenos:', err);
    return '/home';
  }
}
