import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icone from './Icone';
import { GRUPOS } from '../lib/gruposAlimentares';
import { guardarMetaSugerida, limparMetaEdicaoId } from '../lib/sessao';
import { MIN_REFEICOES, refeicoesParaAnalise, sugerirMetas } from '../lib/sugestoesMetas';
import type { SugestaoMeta } from '../lib/sugestoesMetas';
import { listarRefeicoesDesde } from '../services/refeicoes';
import type { FilhoAtivo, Meta, Refeicao } from '../types';

// "Agora não" esconde a sugestão por uma semana, só neste aparelho
const DIAS_ESCONDIDA = 7;
const chaveOcultas = (filhoId: string) => `sugestoes_ocultas_${filhoId}`;

function lerOcultas(filhoId: string | undefined): Record<string, number> {
  if (!filhoId) return {};
  try {
    return JSON.parse(localStorage.getItem(chaveOcultas(filhoId)) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function salvarOcultas(filhoId: string, ocultas: Record<string, number>): void {
  try {
    localStorage.setItem(chaveOcultas(filhoId), JSON.stringify(ocultas));
  } catch {
    /* sem armazenamento: a sugestão só some até sair da tela */
  }
}

export interface EstadoSugestoes {
  carregando: boolean;
  analisadas: number; // quantas refeições entraram na análise
  sugestoes: SugestaoMeta[];
  ocultar: (s: SugestaoMeta) => void;
}

// Busca as refeições e calcula as sugestões (a tela de metas usa o número na aba "Sugestões de metas")
export function useSugestoesMetas(filho: FilhoAtivo | null, metas: Meta[]): EstadoSugestoes {
  const filhoId = filho?.id;
  const filhoNome = filho?.nome || '';
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null);
  const [ocultas, setOcultas] = useState<Record<string, number>>(() => lerOcultas(filhoId));

  useEffect(() => {
    if (!filhoId) return;
    let ativo = true;
    const agora = new Date();
    // 30 dias: a análise usa as últimas refeições; o resto serve para achar alimentos que ela já aceita
    listarRefeicoesDesde(filhoId, new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29))
      .then((lista) => { if (ativo) setRefeicoes(lista); })
      .catch((err) => { console.error('Falha ao buscar refeições para as sugestões:', err); if (ativo) setRefeicoes([]); });
    return () => { ativo = false; };
  }, [filhoId]);

  const sugestoes = useMemo(() => {
    if (!refeicoes) return [];
    const limite = Date.now() - DIAS_ESCONDIDA * 24 * 60 * 60 * 1000;
    return sugerirMetas(refeicoes, metas, filhoNome).filter((s) => !(ocultas[s.id] > limite));
  }, [refeicoes, metas, filhoNome, ocultas]);

  const ocultar = useCallback((s: SugestaoMeta) => {
    if (!filhoId) return;
    setOcultas((atual) => {
      const novas = { ...atual, [s.id]: Date.now() };
      salvarOcultas(filhoId, novas);
      return novas;
    });
  }, [filhoId]);

  return {
    carregando: refeicoes === null,
    analisadas: refeicoes ? refeicoesParaAnalise(refeicoes).length : 0,
    sugestoes,
    ocultar
  };
}

// Conteúdo da aba "Sugestões de metas"
export default function SugestoesMetas({ filho, estado }: { filho: FilhoAtivo; estado: EstadoSugestoes }) {
  const navigate = useNavigate();
  const { carregando, analisadas, sugestoes, ocultar } = estado;

  if (carregando) return <p className="empty-note">Carregando…</p>;

  // Poucas refeições: explica por que ainda não há sugestões
  if (analisadas < MIN_REFEICOES) {
    return (
      <p className="goal-sugestoes-nota">
        Registre pelo menos {MIN_REFEICOES} refeições para receber sugestões de metas a partir do que {filho.nome} come.
        {analisadas > 0 ? ` Já tem ${analisadas}.` : ''}
      </p>
    );
  }

  function criar(s: SugestaoMeta) {
    limparMetaEdicaoId();
    guardarMetaSugerida({ tipo: s.tipo, alimento: s.alimento, titulo: s.titulo, descricao: s.descricao, dias: s.dias, cor: GRUPOS[s.grupo].cor });
    navigate('/adicionar-meta');
  }

  return (
    <section className="goal-sugestoes" aria-label="Sugestões de metas">
      <p className="goal-sugestoes-sub">
        <Icone nome="mdi:lightbulb-on-outline" cor="2f6b47" tamanho={18} />
        Com base nas últimas {analisadas} refeições registradas de {filho.nome}
      </p>
      {sugestoes.length === 0 && (
        <p className="goal-sugestoes-nota">Nenhuma sugestão agora: frutas, verduras e proteínas estão aparecendo nas refeições. Continue registrando!</p>
      )}
      {sugestoes.map((s) => (
        <div key={s.id} className="goal-sugestao" style={{ borderLeftColor: GRUPOS[s.grupo].cor }}>
          <span className="goal-sugestao-grupo" style={{ background: GRUPOS[s.grupo].cor }}>
            {s.motivo === 'ultraprocessados' ? 'Ultraprocessados' : GRUPOS[s.grupo].nome}
          </span>
          <p className="goal-sugestao-msg">{s.mensagem}</p>
          <p className="goal-sugestao-convite">{s.convite}</p>
          <div className="goal-sugestao-acoes">
            <button className="goal-sugestao-criar" type="button" onClick={() => criar(s)}>Criar esta meta</button>
            <button className="goal-sugestao-depois" type="button" onClick={() => ocultar(s)}>Agora não</button>
          </div>
        </div>
      ))}
    </section>
  );
}
