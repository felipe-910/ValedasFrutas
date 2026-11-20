// Notificações do responsável (sininho da home).
// Tipos registrados hoje:
//   login                 - o usuário entrou no sistema
//   meta_criada           - uma meta nova foi cadastrada
//   meta_dia_cumprido     - o pequeno cumpriu mais um dia de uma meta (e ganhou XP)
//   meta_atingida         - a meta foi concluída
//   meta_progresso_revertido - uma refeição apagada/editada reduziu o progresso de uma meta
//   meta_prazo_proximo    - hoje é o último dia da meta e ela ainda não foi concluída
//   meta_prazo_encerrado  - o prazo da meta acabou sem ela ser concluída
import {
  collection,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { codigoDoErro } from './erros';
import { paraData, paraMillis } from '../lib/tempo';
import { calcularProgressoMeta, corteDaMeta } from './progressoMeta';
import { listarRefeicoesDesde } from './refeicoes';
import type { Filho, Meta, Notificacao, TipoNotificacao } from '../types';

const COLECAO = 'notificacoes';
const DIA_MS = 24 * 60 * 60 * 1000;

export interface NovaNotificacao {
  tipo: TipoNotificacao;
  titulo?: string;
  mensagem?: string;
  filhoId?: string;
  filhoNome?: string;
  metaId?: string;
}

// CREATE - cria uma notificação para o responsável logado.
// Se `id` for informado, a notificação só é criada UMA vez: as regras do Firestore
// não deixam editar, então uma segunda tentativa com o mesmo id é recusada em silêncio.
// (usado para não repetir "prazo acabando" ou "meta atingida" a cada vez que o app abre)
export async function criarNotificacao(
  { tipo, titulo, mensagem, filhoId, filhoNome, metaId }: NovaNotificacao,
  id?: string
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const dados = {
    responsavelId: user.uid,
    tipo,
    titulo: titulo || '',
    mensagem: mensagem || '',
    ...(filhoId ? { filhoId } : {}),
    ...(filhoNome ? { filhoNome } : {}),
    ...(metaId ? { metaId } : {}),
    criadoEm: serverTimestamp()
  };
  try {
    if (id) await setDoc(doc(db, COLECAO, id), dados);
    else await addDoc(collection(db, COLECAO), dados);
    return true;
  } catch (err) {
    // permission-denied = essa notificação já existe. Qualquer falha aqui nunca deve travar o app.
    if (codigoDoErro(err) !== 'permission-denied') console.error('Falha ao registrar notificação:', err);
    return false;
  }
}

// Quando uma meta é reaberta, ou perde progresso, ela ganha um número de revisão (`revisoes`).
// Ele entra no id dos avisos para que o mesmo marco (ex.: "meta atingida", "dia 3 cumprido")
// possa ser avisado de novo, sem repetir os avisos antigos. Metas sem revisão mantêm os ids de sempre.
export function sufixoRevisao(meta: Pick<Meta, 'revisoes'> | null | undefined): string {
  const r = Number(meta?.revisoes) || 0;
  return r > 0 ? `_v${r}` : '';
}

// CREATE - registra um login do responsável logado.
// Chamado logo após o login (email/senha ou Google) ter sucesso.
export async function registrarLogin(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, COLECAO), {
      responsavelId: user.uid,
      tipo: 'login',
      criadoEm: serverTimestamp()
    });
  } catch (err) {
    // Uma falha aqui nunca deve travar o login do usuário
    console.error('Falha ao registrar notificação de login:', err);
  }
}

// READ - lista as notificações do responsável logado, mais recentes primeiro
export async function listarNotificacoes(max = 30): Promise<Notificacao[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, COLECAO), where('responsavelId', '==', user.uid));
  const snap = await getDocs(q);
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notificacao);
  lista.sort((a, b) => paraMillis(b.criadoEm) - paraMillis(a.criadoEm));
  return lista.slice(0, max);
}

// ---------- Visto / não visto (guardado no aparelho, já que as notificações não podem ser editadas) ----------

function chaveVisto(): string {
  return `notif_visto_${auth.currentUser?.uid || ''}`;
}

export function ultimaVisita(): number {
  return Number(localStorage.getItem(chaveVisto())) || 0;
}

// Recebe a lista que acabou de ser mostrada e guarda o horário (do servidor) da notificação mais recente.
// Assim o relógio do aparelho não atrapalha: se estivesse adiantado, notificações novas apareceriam como "já vistas".
export function marcarComoVistas(notificacoes: Notificacao[] = []): void {
  const maisRecente = notificacoes.reduce((max, n) => Math.max(max, paraMillis(n.criadoEm)), 0);
  localStorage.setItem(chaveVisto(), String(Math.max(maisRecente, ultimaVisita())));
}

// Quantas notificações chegaram depois da última vez que o responsável abriu a tela de notificações
export async function contarNaoLidas(): Promise<number> {
  const visto = ultimaVisita();
  const lista = await listarNotificacoes();
  return lista.filter((n) => paraMillis(n.criadoEm) > visto).length;
}

// ---------- Prazos das metas ----------

// O prazo é o fim do último dia da meta: a meta conta `dias` dias, começando no dia em que foi criada.
// Ex.: meta de 3 dias criada na segunda -> segunda, terça e quarta; o prazo acaba na quarta às 23h59.
// Se a meta foi reaberta, a contagem recomeça no dia da reabertura (`inicioEm`).
export function prazoDaMeta(meta: Meta): Date | null {
  const ini = paraData(meta.inicioEm) ?? paraData(meta.criadoEm);
  if (!meta.dias || !ini) return null;
  return new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + meta.dias);
}

// Confere todas as metas em andamento do responsável e avisa quando
// o último dia chegou ou quando o prazo acabou sem a meta ser concluída.
// Cada aviso é criado uma única vez por meta. Pode ser chamado sempre que o app abrir.
export async function verificarPrazos(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const [metasSnap, filhosSnap] = await Promise.all([
      getDocs(query(collection(db, 'metas'), where('responsavelId', '==', user.uid))),
      getDocs(query(collection(db, 'filhos'), where('responsavelId', '==', user.uid)))
    ]);
    const nomes = new Map<string, string>(filhosSnap.docs.map((d) => [d.id, (d.data() as Filho).nome]));
    const agora = Date.now();

    for (const d of metasSnap.docs) {
      const meta = { id: d.id, ...d.data() } as Meta;
      if (meta.concluida) continue;
      if (meta.tipo !== 'refeicao' && meta.tipo !== 'alimento') continue; // só essas têm prazo em dias
      const prazo = prazoDaMeta(meta);
      if (!prazo) continue;

      const restanteAgora = prazo.getTime() - agora;
      const dentroDaJanela = restanteAgora > 0
        ? restanteAgora <= DIA_MS
        : -restanteAgora <= 7 * DIA_MS;
      if (!dentroDaJanela) continue;

      // Confere nas refeições registradas se a meta já foi cumprida, em vez de confiar só no que está salvo
      // na meta (que pode estar um passo atrás). Meta cumprida nunca gera aviso de "dia acabando" nem de "prazo acabou".
      try {
        const refeicoes = await listarRefeicoesDesde(meta.filhoId, corteDaMeta(meta));
        if (calcularProgressoMeta(meta, refeicoes).concluida) continue;
      } catch (err) {
        console.error('Falha ao conferir o progresso da meta antes de avisar o prazo:', err);
        continue; // na dúvida, não avisa
      }

      const filhoNome = nomes.get(meta.filhoId) || 'seu pequeno';
      const faltam = Math.max(0, (meta.dias || 0) - (meta.diasCumpridos || 0));
      const restante = prazo.getTime() - agora;
      const base = { filhoId: meta.filhoId, filhoNome, metaId: meta.id };

      if (restante > 0 && restante <= DIA_MS) {
        await criarNotificacao({
          ...base,
          tipo: 'meta_prazo_proximo',
          titulo: 'O dia da meta está acabando',
          mensagem: `Hoje é o último dia da meta "${meta.titulo}" de ${filhoNome}. Faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'} para cumprir.`
        }, `${meta.id}_prazo_proximo${sufixoRevisao(meta)}`);
      } else if (restante <= 0 && -restante <= 7 * DIA_MS) {
        // só avisa se o prazo acabou há até 7 dias (não enche a lista com metas muito antigas)
        await criarNotificacao({
          ...base,
          tipo: 'meta_prazo_encerrado',
          titulo: 'O prazo da meta acabou',
          mensagem: `O prazo da meta "${meta.titulo}" de ${filhoNome} terminou com ${meta.diasCumpridos || 0} de ${meta.dias} dias cumpridos.`
        }, `${meta.id}_prazo_encerrado${sufixoRevisao(meta)}`);
      }
    }
  } catch (err) {
    console.error('Falha ao verificar os prazos das metas:', err);
  }
}
