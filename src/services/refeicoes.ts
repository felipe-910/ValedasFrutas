// CRUD das refeições registradas de cada pequeno, no Firestore
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import type { QueryConstraint, QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { codigoDoErro, mensagemDoErro } from './erros';
import { paraMillis } from '../lib/tempo';
import type { Intervalo } from '../lib/tempo';
import type { Alimento, Refeicao, StatusRefeicao, TipoRefeicao } from '../types';

const COLECAO = 'refeicoes';

// Quantas refeições cada "página" da lista traz
export const TAMANHO_PAGINA = 15;

// CREATE - registra uma nova refeição vinculada a um pequeno
// status: 'completa' | 'metade' | 'nao_comeu' (como a criança comeu a refeição)
export async function addRefeicao({ filhoId, tipo, alimentos, status }: {
  filhoId: string;
  tipo: TipoRefeicao;
  alimentos: Alimento[];
  status: StatusRefeicao;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário logado.');
  await addDoc(collection(db, COLECAO), {
    responsavelId: user.uid,
    filhoId,
    tipo,
    alimentos,
    status,
    criadoEm: serverTimestamp()
  });
}

function paraLista(snap: QuerySnapshot): Refeicao[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Refeicao);
}

function maisRecentesPrimeiro(lista: Refeicao[]): Refeicao[] {
  return lista.sort((a, b) => paraMillis(b.criadoEm) - paraMillis(a.criadoEm));
}

// Cursor de paginação: o último documento da página anterior, ou { offset } no modo de reserva
export type CursorRefeicoes = QueryDocumentSnapshot | { offset: number } | null;

export interface PaginaRefeicoes {
  itens: Refeicao[];
  cursor: CursorRefeicoes;
  temMais: boolean;
}

function ehOffset(cursor: CursorRefeicoes): cursor is { offset: number } {
  return cursor !== null && 'offset' in cursor && typeof cursor.offset === 'number';
}

// READ (paginado) - uma página das refeições de um pequeno, mais recentes primeiro.
// A ordem, o filtro por tipo e o limite são feitos pelo Firestore: o app só baixa a página pedida.
//   tipos:  null (todas) ou lista de tipos, ex.: ['Lanche da manhã', 'Lanche da tarde']
//   periodo: null (qualquer data) ou { inicio, fim } (início inclusive, fim exclusivo)
//   cursor: o `cursor` devolvido pela página anterior (null = primeira página)
// Precisa dos índices de firestore.indexes.json. Enquanto eles não existirem, cai no modo de reserva
// (baixa tudo e pagina no aparelho) e avisa no console, para o app não parar de funcionar.
export async function listarRefeicoes(
  filhoId: string,
  { tipos = null, periodo = null, limite: tamanho = TAMANHO_PAGINA, cursor = null }: {
    tipos?: TipoRefeicao[] | null;
    periodo?: Intervalo | null;
    limite?: number;
    cursor?: CursorRefeicoes;
  } = {}
): Promise<PaginaRefeicoes> {
  const user = auth.currentUser;
  if (!user) return { itens: [], cursor: null, temMais: false };

  // cursor { offset } = a primeira página já caiu no modo de reserva; continua nele
  if (ehOffset(cursor)) {
    return paginaEmMemoria(filhoId, user.uid, tipos, periodo, tamanho, cursor.offset);
  }

  const restricoes: QueryConstraint[] = [where('filhoId', '==', filhoId), where('responsavelId', '==', user.uid)];
  if (tipos && tipos.length === 1) restricoes.push(where('tipo', '==', tipos[0]));
  else if (tipos && tipos.length > 1) restricoes.push(where('tipo', 'in', tipos));
  if (periodo) {
    restricoes.push(where('criadoEm', '>=', Timestamp.fromDate(periodo.inicio)));
    restricoes.push(where('criadoEm', '<', Timestamp.fromDate(periodo.fim)));
  }
  restricoes.push(orderBy('criadoEm', 'desc'));
  if (cursor) restricoes.push(startAfter(cursor));
  restricoes.push(limit(tamanho + 1)); // +1 só para saber se ainda existe uma próxima página

  try {
    const snap = await getDocs(query(collection(db, COLECAO), ...restricoes));
    const temMais = snap.docs.length > tamanho;
    const pagina = temMais ? snap.docs.slice(0, tamanho) : snap.docs;
    return {
      itens: pagina.map((d) => ({ id: d.id, ...d.data() }) as Refeicao),
      cursor: pagina.length ? pagina[pagina.length - 1] : cursor,
      temMais
    };
  } catch (err) {
    if (codigoDoErro(err) !== 'failed-precondition') throw err;
    console.warn('Falta criar o índice do Firestore para listar as refeições (veja firestore.indexes.json). Usando o modo de reserva:', mensagemDoErro(err));
    return paginaEmMemoria(filhoId, user.uid, tipos, periodo, tamanho, 0);
  }
}

// Modo de reserva: baixa tudo, filtra, ordena e fatia no aparelho
async function paginaEmMemoria(
  filhoId: string,
  uid: string,
  tipos: TipoRefeicao[] | null,
  periodo: Intervalo | null,
  tamanho: number,
  offset: number
): Promise<PaginaRefeicoes> {
  const snap = await getDocs(query(collection(db, COLECAO), where('filhoId', '==', filhoId), where('responsavelId', '==', uid)));
  let lista = paraLista(snap);
  if (tipos && tipos.length) lista = lista.filter((r) => tipos.includes(r.tipo));
  if (periodo) {
    const ini = periodo.inicio.getTime();
    const fim = periodo.fim.getTime();
    lista = lista.filter((r) => {
      const t = paraMillis(r.criadoEm);
      return t >= ini && t < fim;
    });
  }
  maisRecentesPrimeiro(lista);
  const itens = lista.slice(offset, offset + tamanho);
  const fim = offset + itens.length;
  return { itens, cursor: { offset: fim }, temMais: fim < lista.length };
}

// READ - só as refeições a partir de um momento (usado para calcular o progresso das metas,
// que só precisam do que aconteceu depois que a meta começou). Mais recentes primeiro.
export async function listarRefeicoesDesde(filhoId: string, desde: Date): Promise<Refeicao[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const base = [where('filhoId', '==', filhoId), where('responsavelId', '==', user.uid)];
  try {
    const snap = await getDocs(query(
      collection(db, COLECAO),
      ...base,
      where('criadoEm', '>=', Timestamp.fromDate(desde)),
      orderBy('criadoEm', 'desc')
    ));
    return paraLista(snap);
  } catch (err) {
    if (codigoDoErro(err) !== 'failed-precondition') throw err;
    console.warn('Falta criar o índice do Firestore para as refeições (veja firestore.indexes.json). Usando o modo de reserva:', mensagemDoErro(err));
    const snap = await getDocs(query(collection(db, COLECAO), ...base));
    const corte = desde.getTime();
    return maisRecentesPrimeiro(paraLista(snap).filter((r) => paraMillis(r.criadoEm) >= corte));
  }
}

// UPDATE - atualiza uma refeição já registrada (tipo e/ou alimentos)
export async function updateRefeicao(id: string, dados: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), dados);
}

// DELETE - remove um registro de refeição
export async function deleteRefeicao(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id));
}
