// CRUD das metas de cada pequeno, no Firestore
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { listarRefeicoesDesde } from './refeicoes';
import { criarNotificacao, sufixoRevisao } from './notificacoes';
import { paraMillis } from '../lib/tempo';
import { calcularProgressoMeta, corteDaMeta, normalizar, refeicoesDaMeta, xpTotalDaMeta } from './progressoMeta';
import { sincronizarXpDaMeta } from './xp';

// continuam disponíveis por aqui, como antes
export { calcularProgressoMeta, corteDaMeta, refeicoesDaMeta, xpTotalDaMeta };
import type {
  Filho,
  GanhoMeta,
  Meta,
  PerdaMeta,
  ProgressoMeta,
  ResultadoSincronizacao,
  TipoMeta,
  TipoRefeicao
} from '../types';

const COLECAO = 'metas';

// XP definido pelo sistema (o pai informa só os dias)
export const XP_POR_REFEICAO = 10; // por refeição completa, por dia
export const XP_POR_ALIMENTO = 15; // por dia em que o alimento foi comido

export function calcularXpMeta({ tipo, qtdRefeicoes = 0, dias = 0 }: {
  tipo: TipoMeta;
  qtdRefeicoes?: number;
  dias?: number;
}): { xpPorDia: number; xpTotal: number } {
  const xpPorDia = tipo === 'refeicao' ? qtdRefeicoes * XP_POR_REFEICAO : tipo === 'alimento' ? XP_POR_ALIMENTO : 0;
  return { xpPorDia, xpTotal: xpPorDia * dias };
}

// Metas de refeição e de alimento são acompanhadas pelo sistema; a meta simples o pai marca na mão
export function ehAutomatica(meta: Pick<Meta, 'tipo'>): boolean {
  return meta.tipo === 'refeicao' || meta.tipo === 'alimento';
}

export interface DadosNovaMeta {
  filhoId: string;
  filhoNome?: string;
  titulo: string;
  descricao?: string;
  cor: string;
  recompensa: string;
  tipo?: TipoMeta;
  tiposRefeicao?: TipoRefeicao[];
  alimento?: string;
  dias?: number;
}

// CREATE - cadastra uma nova meta vinculada a um pequeno
// tipo: 'simples' (padrão), 'refeicao' ou 'alimento'
// refeicao: usa tiposRefeicao (lista, ex: ['Almoço', 'Janta']), dias e dias
// alimento: usa alimento (ex: 'Abóbora') e dias
// O XP (por dia e total) e o progresso são calculados pelo sistema (calcularProgressoMeta)
export async function addMeta({ filhoId, filhoNome, titulo, descricao, cor, recompensa, tipo = 'simples', tiposRefeicao, alimento, dias }: DadosNovaMeta): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  const { xpPorDia, xpTotal } = calcularXpMeta({ tipo, qtdRefeicoes: (tiposRefeicao || []).length, dias });
  await addDoc(collection(db, COLECAO), {
    responsavelId: user.uid,
    filhoId,
    titulo,
    descricao: descricao || '',
    cor,
    recompensa,
    tipo,
    ...(tipo === 'refeicao' ? { tiposRefeicao, dias, xpPorDia, xpTotal, diasCumpridos: 0, xpAtual: 0 } : {}),
    ...(tipo === 'alimento' ? { alimento, dias, xpPorDia, xpTotal, diasCumpridos: 0, xpAtual: 0 } : {}),
    concluida: false,
    criadoEm: serverTimestamp()
  });
  await criarNotificacao({
    tipo: 'meta_criada',
    titulo: 'Nova meta criada',
    mensagem: `A meta "${titulo}" foi criada para ${filhoNome || 'seu pequeno'}.`,
    filhoId
  });
}

// Notificação de meta atingida (criada uma única vez por meta, ou uma vez a cada reabertura)
export function avisarMetaAtingida(meta: Meta, filhoNome?: string): Promise<boolean> {
  return criarNotificacao({
    tipo: 'meta_atingida',
    titulo: 'Meta atingida! 🎉',
    mensagem: `${filhoNome || 'Seu pequeno'} atingiu a meta "${meta.titulo}"!${meta.recompensa ? ` Hora da recompensa: ${meta.recompensa}.` : ''}`,
    filhoId: meta.filhoId,
    metaId: meta.id
  }, `${meta.id}_atingida${sufixoRevisao(meta)}`);
}

// READ - lista todas as metas de um pequeno, das mais novas para as mais antigas
export async function listarMetas(filhoId: string): Promise<Meta[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, COLECAO), where('filhoId', '==', filhoId), where('responsavelId', '==', user.uid));
  const snap = await getDocs(q);
  const metas = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Meta);
  // mais novas no topo, mais antigas embaixo. Uma meta recém-criada ainda pode estar sem a data
  // do servidor (criadoEm vazio): ela é a mais nova de todas, então vai para o topo.
  const quando = (m: Meta) => (m.criadoEm ? paraMillis(m.criadoEm) : Number.MAX_SAFE_INTEGER);
  return metas.sort((a, b) => quando(b) - quando(a));
}

// READ - busca uma meta pelo id (só devolve se for do responsável logado)
export async function obterMeta(id: string): Promise<Meta | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, COLECAO, id));
  if (!snap.exists()) return null;
  const meta = { id: snap.id, ...snap.data() } as Meta;
  return meta.responsavelId === user.uid ? meta : null;
}

// UPDATE - atualiza uma meta (ex: marcar como concluída)
export async function updateMeta(id: string, dados: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), dados);
}

// DELETE - exclui uma meta. As notificações que ela já gerou ficam no histórico.
export async function deleteMeta(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id));
}

// ---------- Metas de refeição e de alimento: progresso calculado a partir das refeições registradas ----------

// Texto curto (para o toast) quando refeições apagadas/editadas reduziram o progresso de metas.
// `perdas` é a lista devolvida por sincronizarMetas.
export function mensagemPerdas(perdas: PerdaMeta[] = []): string {
  if (!perdas.length) return '';
  if (perdas.length === 1) {
    const p = perdas[0];
    return p.reaberta
      ? `A meta "${p.titulo}" voltou para "Atuais": agora tem ${p.diasDepois} de ${p.total} dias.`
      : `A meta "${p.titulo}" agora tem ${p.diasDepois} de ${p.total} dias.`;
  }
  const reabertas = perdas.filter((p) => p.reaberta).length;
  return `${perdas.length} metas perderam progresso${reabertas ? ` (${reabertas} voltou para "Atuais")` : ''}. Veja os detalhes nas notificações.`;
}

// Sincroniza as metas de TODOS os pequenos do responsável logado.
// Usada antes de checar prazos, para não avisar "prazo acabou" com dados de progresso desatualizados.
export async function sincronizarTodasAsMetas(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDocs(query(collection(db, 'filhos'), where('responsavelId', '==', user.uid)));
    for (const d of snap.docs) {
      await sincronizarMetas(d.id, (d.data() as Filho).nome);
    }
  } catch (err) {
    console.error('Falha ao sincronizar as metas:', err);
  }
}

// Recalcula as metas de refeição/alimento de um pequeno, salva o que mudou e devolve:
//   metas  - a lista atualizada
//   ganhos - metas que ganharam XP agora
//   perdas - metas que perderam progresso (refeição apagada ou editada) e/ou voltaram a ficar abertas.
//            Cada perda também gera uma notificação, para o responsável não ser pego de surpresa.
//   xpGeral - quanto o XP GERAL da criança mudou por metas concluídas (ou reabertas) agora
export async function sincronizarMetas(filhoId: string, filhoNome?: string): Promise<ResultadoSincronizacao> {
  const metas = await listarMetas(filhoId);
  const ganhos: GanhoMeta[] = [];
  const perdas: PerdaMeta[] = [];
  let xpGeral = 0;
  const automaticas = metas.filter(ehAutomatica);
  if (!automaticas.length) return { metas, ganhos, perdas, xpGeral };

  // só as refeições a partir do começo da meta mais antiga interessam
  const desde = new Date(Math.min(...automaticas.map((m) => corteDaMeta(m).getTime())));
  const refeicoes = await listarRefeicoesDesde(filhoId, desde);

  for (const meta of automaticas) {
    const novo = calcularProgressoMeta(meta, refeicoes);
    const diasAntes = meta.diasCumpridos || 0;
    const xpAntes = meta.xpAtual || 0;
    if (novo.diasCumpridos === diasAntes && novo.xpAtual === xpAntes && novo.concluida === !!meta.concluida) {
      xpGeral += await ajustarXpGeral(meta); // metas concluídas antes desse recurso também entram no XP geral
      continue;
    }

    const reaberta = !!meta.concluida && !novo.concluida;
    const regrediu = novo.diasCumpridos < diasAntes || reaberta;
    const atualizacao = { ...novo, ...(regrediu ? { revisoes: (meta.revisoes || 0) + 1 } : {}) };
    await updateMeta(meta.id, atualizacao);
    const depois: Meta = { ...meta, ...atualizacao };

    if (regrediu) {
      perdas.push({ titulo: meta.titulo, diasAntes, diasDepois: novo.diasCumpridos, total: meta.dias || 0, reaberta });
      await criarNotificacao({
        tipo: 'meta_progresso_revertido',
        titulo: 'Progresso da meta diminuiu',
        mensagem: `A meta "${meta.titulo}" de ${filhoNome || 'seu pequeno'} passou de ${diasAntes} para ${novo.diasCumpridos} de ${meta.dias} dias, porque uma refeição foi apagada ou alterada.${reaberta ? ' Ela voltou para "Atuais".' : ''}`,
        filhoId,
        metaId: meta.id
      }, `${meta.id}_revertido${sufixoRevisao(depois)}`);
    } else if (novo.diasCumpridos > diasAntes) {
      if (novo.concluida && !meta.concluida) {
        await avisarMetaAtingida(depois, filhoNome);
      } else {
        await criarNotificacao({
          tipo: 'meta_dia_cumprido',
          titulo: 'Mais um dia cumprido!',
          mensagem: `${filhoNome || 'Seu pequeno'} cumpriu ${novo.diasCumpridos} de ${meta.dias} dias da meta "${meta.titulo}" (+${novo.xpAtual - xpAntes} XP).`,
          filhoId,
          metaId: meta.id
        }, `${meta.id}_dia_${novo.diasCumpridos}${sufixoRevisao(depois)}`);
      }
    }
    if (novo.xpAtual > xpAntes) {
      ganhos.push({ titulo: meta.titulo, xp: novo.xpAtual - xpAntes, concluida: novo.concluida && !meta.concluida });
    }
    Object.assign(meta, atualizacao);
    xpGeral += await ajustarXpGeral(meta);
  }
  return { metas, ganhos, perdas, xpGeral };
}

// Meta concluída soma o XP dela ao XP geral da criança; meta reaberta devolve esse XP.
// Só mexe no Firestore quando há diferença (o `xpConcedido` da meta diz o que já foi somado).
// Se falhar, não atrapalha o resto: da próxima sincronização ele tenta de novo.
async function ajustarXpGeral(meta: Meta): Promise<number> {
  const desejado = meta.concluida ? xpTotalDaMeta(meta) : 0;
  const concedido = typeof meta.xpConcedido === 'number' ? meta.xpConcedido : 0;
  if (desejado === concedido) return 0;
  try {
    const ajuste = await sincronizarXpDaMeta(meta.id);
    if (ajuste) meta.xpConcedido = desejado;
    return ajuste ? ajuste.delta : 0;
  } catch (err) {
    console.error('Falha ao somar o XP da meta ao XP geral:', err);
    return 0;
  }
}

export interface CamposEdicaoMeta {
  titulo: string;
  descricao?: string;
  cor: string;
  recompensa: string;
  dias?: number;
  tiposRefeicao?: TipoRefeicao[];
  alimento?: string;
}

// UPDATE - edita uma meta já criada (título, descrição, cor, recompensa e, nas metas automáticas,
// também os dias e as refeições/alimento). O tipo da meta não muda.
// Nas metas automáticas o XP e o progresso são recalculados na mesma gravação, então editar
// não gera avisos de "progresso diminuiu". Se a edição já completa a meta, o aviso de meta atingida é criado.
export async function editarMeta(meta: Meta, campos: CamposEdicaoMeta, filhoNome?: string): Promise<Meta> {
  const dados: Record<string, unknown> = {
    titulo: campos.titulo,
    descricao: campos.descricao || '',
    cor: campos.cor,
    recompensa: campos.recompensa
  };
  let novo: ProgressoMeta | null = null;

  if (ehAutomatica(meta)) {
    const dias = campos.dias;
    const ehRefeicao = meta.tipo === 'refeicao';
    const chave = (lista: string[]) => [...lista].sort().join('|');
    const regraMudou = dias !== meta.dias || (ehRefeicao
      ? chave(campos.tiposRefeicao || []) !== chave(refeicoesDaMeta(meta))
      : normalizar(campos.alimento) !== normalizar(meta.alimento));

    const { xpPorDia, xpTotal } = calcularXpMeta({ tipo: meta.tipo, qtdRefeicoes: (campos.tiposRefeicao || []).length, dias });
    Object.assign(dados, { dias, xpPorDia, xpTotal }, ehRefeicao ? { tiposRefeicao: campos.tiposRefeicao } : { alimento: campos.alimento });

    const mesclada = { ...meta, ...dados } as Meta;
    const refeicoes = await listarRefeicoesDesde(meta.filhoId, corteDaMeta(mesclada));
    novo = calcularProgressoMeta(mesclada, refeicoes);
    Object.assign(dados, novo);
    if (regraMudou) dados.revisoes = (meta.revisoes || 0) + 1;
  }

  await updateDoc(doc(db, COLECAO, meta.id), dados);
  const atualizada = { ...meta, ...dados } as Meta;
  if (novo && novo.concluida && !meta.concluida) await avisarMetaAtingida(atualizada, filhoNome);
  if (ehAutomatica(atualizada)) await ajustarXpGeral(atualizada); // mudar dias/refeições muda o XP da meta concluída
  return atualizada;
}

// UPDATE - reabre uma meta automática já concluída, recomeçando a contagem a partir de agora
// (0 dias cumpridos). Sem isso ela seria concluída de novo na hora, pelas refeições antigas.
export async function reabrirMetaAutomatica(meta: Meta): Promise<void> {
  await updateMeta(meta.id, {
    concluida: false,
    diasCumpridos: 0,
    xpAtual: 0,
    inicioEm: serverTimestamp(),
    revisoes: (meta.revisoes || 0) + 1,
    // o XP geral que a criança já ganhou com essa meta fica com ela; a próxima conclusão soma de novo
    xpConcedido: 0
  });
}
