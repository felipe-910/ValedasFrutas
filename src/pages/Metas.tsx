import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import Icone from '../components/Icone';
import SugestoesMetas, { useSugestoesMetas } from '../components/SugestoesMetas';
import { useToast } from '../context/ToastContext';
import { corEhClara } from '../lib/cores';
import { guardarMetaEdicaoId, limparMetaEdicaoId } from '../lib/sessao';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import {
  avisarMetaAtingida,
  deleteMeta,
  ehAutomatica,
  listarMetas,
  reabrirMetaAutomatica,
  refeicoesDaMeta,
  sincronizarMetas,
  updateMeta,
  xpTotalDaMeta
} from '../services/metas';
import type { FilhoAtivo, Meta } from '../types';

type Aba = 'atuais' | 'concluidas' | 'sugestoes';

const plural = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

function regraDaMeta(meta: Meta): string {
  const total = meta.dias || 0;
  const xpTotal = xpTotalDaMeta(meta);
  const nomes = refeicoesDaMeta(meta).map((t) => t.toLowerCase());
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : (nomes[0] || '');
  if (meta.tipo === 'refeicao') {
    return nomes.length === 5
      ? `Todas as refeições completas, ${plural(total)}, ${xpTotal} XP no total`
      : `${lista.charAt(0).toUpperCase() + lista.slice(1)} ${nomes.length > 1 ? 'completos' : 'completo(a)'}, ${plural(total)}, ${xpTotal} XP no total`;
  }
  if (meta.tipo === 'ausencia') {
    return `Ficar sem comer ${meta.alimento}: conta cada dia já encerrado com refeições registradas e sem ${meta.alimento}, ${plural(total)}, ${xpTotal} XP no total`;
  }
  return `Comer ${meta.alimento} em uma refeição completa, ${plural(total)}, ${xpTotal} XP no total`;
}

interface CartaoProps {
  meta: Meta;
  filho: FilhoAtivo;
  aoAtualizar: (meta: Meta) => void;
  aoSubstituirTodas: (metas: Meta[]) => void;
  aoRemover: (id: string) => void;
}

function CartaoMeta({ meta, filho, aoAtualizar, aoSubstituirTodas, aoRemover }: CartaoProps) {
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const automatica = ehAutomatica(meta);

  async function alternarConclusao() {
    const novoStatus = !meta.concluida;
    setOcupado(true);
    try {
      const dados = novoStatus ? { concluida: true } : { concluida: false, revisoes: (meta.revisoes || 0) + 1 };
      await updateMeta(meta.id, dados);
      const atualizada: Meta = { ...meta, ...dados };
      if (novoStatus) await avisarMetaAtingida(atualizada, filho.nome);
      mostrarToast(novoStatus ? 'Meta concluída! Veja na aba "Concluídas".' : 'Meta reaberta! Ela voltou para "Atuais".');
      aoAtualizar(atualizada);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível atualizar a meta.');
      setOcupado(false);
    }
  }

  // Meta de refeição/alimento concluída: reabrir recomeça a contagem a partir de agora
  async function reabrirAutomatica() {
    const total = meta.dias || 0;
    if (!confirm(`Reabrir vai recomeçar a contagem a partir de agora: 0 de ${plural(total)}, e o XP dessa rodada volta a zero. Continuar?`)) return;
    setOcupado(true);
    try {
      await reabrirMetaAutomatica(meta);
      aoSubstituirTodas((await sincronizarMetas(filho.id, filho.nome)).metas);
      mostrarToast('Meta reaberta! A contagem recomeçou e ela voltou para "Atuais".');
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível reabrir a meta.');
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a meta "${meta.titulo || 'Sem título'}"? Essa ação não pode ser desfeita.`)) return;
    setOcupado(true);
    try {
      await deleteMeta(meta.id);
      mostrarToast('Meta excluída.');
      aoRemover(meta.id);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível excluir a meta.');
      setOcupado(false);
    }
  }

  function editar() {
    guardarMetaEdicaoId(meta.id);
    navigate('/adicionar-meta');
  }

  const total = meta.dias || 0;
  const cumpridos = meta.diasCumpridos || 0;
  const xpTotal = xpTotalDaMeta(meta);

  return (
    <div className="goal-card">
      <div className="goal-card-top" style={{ background: meta.cor || '#6fa981' }}>
        <span className={`goal-card-title${corEhClara(meta.cor) ? ' dark' : ''}`}>{meta.titulo || 'Sem título'}</span>
        <button
          className="goal-check"
          type="button"
          aria-label="Marcar como concluída"
          disabled={ocupado || automatica}
          style={automatica ? { cursor: 'default' } : undefined}
          onClick={alternarConclusao}
        >
          {meta.concluida ? <Icone nome="mdi:check-bold" cor="6fa981" /> : <Icone nome="mdi:flag-variant-outline" cor="bbbbbb" />}
        </button>
      </div>
      <div className="goal-card-reward">Recompensa: <b>{meta.recompensa || '—'}</b></div>

      {automatica && (
        <div className="goal-xp">
          <p className="goal-rule">{regraDaMeta(meta)}</p>
          <div className="goal-xp-info">
            <span className="goal-xp-dias">{cumpridos} / {plural(total)}</span>
            <span className="goal-xp-label">{meta.xpAtual || 0} / {xpTotal} XP</span>
          </div>
          <div className="goal-xp-track"><div className="goal-xp-fill" style={{ width: `${total ? Math.min(100, (cumpridos / total) * 100) : 0}%` }} /></div>
        </div>
      )}

      {/* Metas de refeição e de alimento são concluídas sozinhas; depois de concluídas dá para reabrir */}
      {automatica && meta.concluida && (
        <button className="goal-complete-btn is-done" type="button" disabled={ocupado} onClick={reabrirAutomatica}>
          <Icone nome="mdi:refresh" cor="a3856f" tamanho={18} />Reabrir e recomeçar
        </button>
      )}
      {!automatica && (
        <button className={`goal-complete-btn${meta.concluida ? ' is-done' : ''}`} type="button" disabled={ocupado} onClick={alternarConclusao}>
          {meta.concluida
            ? <><Icone nome="mdi:refresh" cor="a3856f" tamanho={18} />Reabrir meta</>
            : <><Icone nome="mdi:check-circle-outline" cor="6fa981" tamanho={18} />Marcar como concluída</>}
        </button>
      )}

      <div className="goal-actions">
        <button className="goal-action-btn edit" type="button" onClick={editar}>Editar</button>
        <button className="goal-action-btn delete" type="button" disabled={ocupado} onClick={excluir}>Excluir</button>
      </div>
    </div>
  );
}

export default function Metas() {
  usePagina('Metas', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [filho] = useFilhoAtivo();
  const [aba, setAba] = useState<Aba>('atuais');
  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregou, setCarregou] = useState(false);
  const filhoId = filho?.id;
  const filhoNome = filho?.nome;

  const carregar = useCallback(async () => {
    if (!filhoId) return;
    try {
      try {
        // Recalcula as metas de refeição/alimento com base nas refeições registradas
        setMetas((await sincronizarMetas(filhoId, filhoNome)).metas);
      } catch (e) {
        console.error(e);
        setMetas(await listarMetas(filhoId));
      }
      setCarregou(true);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível carregar as metas.');
    }
  }, [filhoId, filhoNome, mostrarToast]);

  useEffect(() => { void carregar(); }, [carregar]);

  const sugestoes = useSugestoesMetas(filho, metas);
  const qtdSugestoes = carregou && !sugestoes.carregando ? sugestoes.sugestoes.length : 0;

  useTutorialDaTela('metas', carregou); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  const filtradas = metas.filter((m) => (aba === 'atuais' ? !m.concluida : m.concluida));

  return (
    <>
      <BarraTopo titulo="Metas" voltarPara="/crianca" />

      <div className="child-body">
        <div className="goal-tabs">
          <button className={`goal-tab${aba === 'atuais' ? ' active' : ''}`} type="button" onClick={() => setAba('atuais')}>Atuais</button>
          <button className={`goal-tab${aba === 'concluidas' ? ' active' : ''}`} type="button" onClick={() => setAba('concluidas')}>Concluídas</button>
          <button
            className={`goal-tab goal-tab-sugestoes${aba === 'sugestoes' ? ' active' : ''}`}
            type="button"
            aria-label={qtdSugestoes ? `Sugestões de metas (${qtdSugestoes})` : 'Sugestões de metas'}
            onClick={() => setAba('sugestoes')}
          >
            Sugestões de metas
            {qtdSugestoes > 0 && <span className="goal-tab-qtd">{qtdSugestoes}</span>}
          </button>
        </div>

        {aba === 'sugestoes' && (carregou ? <SugestoesMetas filho={filho} estado={sugestoes} /> : <p className="empty-note">Carregando…</p>)}

        <div>
          {aba !== 'sugestoes' && filtradas.map((meta) => (
            <CartaoMeta
              key={meta.id}
              meta={meta}
              filho={filho}
              aoAtualizar={(nova) => setMetas((lista) => lista.map((m) => (m.id === nova.id ? nova : m)))}
              aoSubstituirTodas={setMetas}
              aoRemover={(id) => setMetas((lista) => lista.filter((m) => m.id !== id))}
            />
          ))}
        </div>
        <p className="empty-note goals-empty" style={{ display: carregou && aba !== 'sugestoes' && !filtradas.length ? 'block' : 'none' }}>Nenhuma meta por aqui ainda.</p>

        <button className="cta" type="button" onClick={() => { limparMetaEdicaoId(); navigate('/adicionar-meta'); }}>+ Nova meta</button>
      </div>
    </>
  );
}
