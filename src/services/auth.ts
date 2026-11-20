// CRUD completo de autenticação (email/senha + Google) usando Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithPopup,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged,
  signOut,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import type { NextOrObserver, Unsubscribe, User } from 'firebase/auth';
import { auth } from '../firebase';
import { codigoDoErro } from './erros';
import { marcarContaNova } from './tutorial';

const googleProvider = new GoogleAuthProvider();

/* ---------- CREATE ---------- */
// Cria uma conta nova com email e senha
export async function registerUser(nome: string, email: string, senha: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  if (nome) {
    await updateProfile(cred.user, { displayName: nome });
  }
  await marcarContaNova(cred.user.uid); // primeiro acesso: o tutorial da Alice aparece (obrigatório)
  return cred.user;
}

/* ---------- READ / LOGIN ---------- */
// Login com email e senha
export async function loginUser(email: string, senha: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

// Login (ou cadastro automático, se a conta ainda não existir) com Google
export async function loginWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  if (getAdditionalUserInfo(cred)?.isNewUser) await marcarContaNova(cred.user.uid); // conta criada agora pelo Google
  return cred.user;
}

// Envia email de redefinição de senha
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Confere se o código (oobCode) do link de redefinição enviado por email ainda é válido
// e devolve o email da conta, para exibir na página própria de redefinição
export async function verificarCodigoRedefinicao(oobCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

// Confirma a nova senha usando o código (oobCode) recebido pelo link de email
export async function confirmarNovaSenha(oobCode: string, novaSenha: string): Promise<void> {
  await confirmPasswordReset(auth, oobCode, novaSenha);
}

// Observa o estado de login (chama o callback sempre que o usuário logar/deslogar)
export function watchAuthState(callback: NextOrObserver<User>): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/* ---------- UPDATE ---------- */
// Atualiza nome e/ou foto do perfil
export async function updateUserProfile({ nome, fotoURL }: { nome?: string; fotoURL?: string } = {}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await updateProfile(user, {
    displayName: nome ?? user.displayName,
    photoURL: fotoURL ?? user.photoURL
  });
}

// Atualiza a senha do usuário logado (o Firebase exige login recente para isso)
export async function updateUserPassword(novaSenha: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await updatePassword(user, novaSenha);
}

/* ---------- SENHA DA ÁREA DOS PAIS ---------- */
// Quem entrou só com o Google ainda não tem senha. A senha protege a volta da área da criança.

// O usuário logado já tem uma senha (conta criada com e-mail e senha, ou senha adicionada depois)?
export function temSenha(): boolean {
  const user = auth.currentUser;
  return !!user && user.providerData.some((p) => p.providerId === 'password');
}

// Usuário logado agora (ou null)
export function usuarioAtual(): User | null {
  return auth.currentUser;
}

// Confere a senha do usuário logado, sem deslogar. Lança erro se estiver errada.
export async function verificarSenha(senha: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Nenhum usuário logado.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senha));
}

// Cria a senha de quem entrou com o Google, ligando e-mail e senha à mesma conta.
// Depois disso a pessoa também pode entrar com e-mail e senha.
export async function definirSenha(novaSenha: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Nenhum usuário logado.');
  const credencial = EmailAuthProvider.credential(user.email, novaSenha);
  try {
    await linkWithCredential(user, credencial);
  } catch (err) {
    const codigo = codigoDoErro(err);
    if (codigo === 'auth/requires-recent-login') {
      // o Firebase pede um login recente: confirma com o Google e tenta de novo
      await reauthenticateWithPopup(user, googleProvider);
      await linkWithCredential(user, credencial);
    } else if (codigo === 'auth/provider-already-linked') {
      await updatePassword(user, novaSenha);
    } else {
      throw err;
    }
  }
}

// Troca a senha de quem já tem uma: confere a atual e grava a nova
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await verificarSenha(senhaAtual);
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await updatePassword(user, novaSenha);
}

/* ---------- DELETE ---------- */
// Exclui a conta do usuário logado (o Firebase exige login recente para isso)
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await deleteUser(user);
}

/* ---------- LOGOUT ---------- */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/* ---------- Mensagens de erro em pt-BR ---------- */
const MENSAGENS_ERRO: Record<string, string> = {
  'auth/email-already-in-use': 'Este email já está cadastrado.',
  'auth/invalid-email': 'Email inválido.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'Email ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/popup-closed-by-user': 'Login com Google cancelado.',
  'auth/popup-blocked': 'O navegador bloqueou o popup do Google. Permita popups para este site.',
  'auth/cancelled-popup-request': 'Login com Google cancelado.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  'auth/requires-recent-login': 'Por segurança, entre novamente antes de repetir essa ação.',
  'auth/operation-not-allowed': 'Login com Google não está habilitado no Firebase Console (Authentication > Sign-in method).',
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase Console (Authentication > Settings > Authorized domains).',
  'auth/configuration-not-found': 'O provedor Google não está configurado no Firebase Console.',
  'auth/internal-error': 'Erro interno do Firebase. Confira se o provedor Google está habilitado no Console.',
  'auth/missing-email': 'Digite seu email.',
  'auth/expired-action-code': 'Este link de redefinição expirou. Solicite um novo.',
  'auth/invalid-action-code': 'Este link de redefinição já foi usado ou é inválido. Solicite um novo.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/credential-already-in-use': 'Já existe outra conta usando este e-mail e senha.',
  'auth/user-mismatch': 'Senha incorreta.'
};

export function traduzErro(codigo: string | undefined): string {
  if (codigo && MENSAGENS_ERRO[codigo]) return MENSAGENS_ERRO[codigo];
  console.error('Código de erro do Firebase não mapeado:', codigo);
  return `Ocorreu um erro (${codigo || 'desconhecido'}). Veja o console para detalhes.`;
}
