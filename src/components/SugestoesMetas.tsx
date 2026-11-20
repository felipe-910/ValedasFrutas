import { useEffect, useMemo, useState } from 'react';
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

function lerOcultas(filhoId: string): Record<string, number> {
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

// Sugestões de metas a partir das refeições registradas (aparece no topo da aba "Atuais" das metas)
export default function SugestoesMetas({ filho, metas }: { filho: FilhoAtivo; metas: Meta[] }) {
  const navigate = useNavigate();
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null);
  const [ocultas, setOcultas] = useState<Record<string, number>>(() => lerOcultas(filho.id));

  useEffect(() => {
    let ativo = true;
    const agora = new Date();
    // 30 dias: a análise usa as últimas refeições; o resto serve para a dica de alimentos que ela já aceita
    listarRefeicoesDesde(filho.id, new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29))
      .then((lista) => { if (ativo) setRefeicoes(lista); })
      .catch((err) => { console.error('Falha ao buscar refeições para as sugestões:', err); if (ativo) setRefeicoes([]); });
    return () => { ativo = false; };
  }, [filho.id]);

  const sugestoes = useMemo(() => {
    if (!refeicoes) return [];
    const limite = Date.now() - DIAS_ESCONDIDA * 24 * 60 * 60 * 1000;
    return sugerirMetas(refeicoes, metas, filho.nome).filter((s) => !(ocultas[s.id] > limite));
  }, [refeicoes, metas, filho.nome, ocultas]);

  if (!refeicoes) return null;

  // Poucas refeições: explica por que ainda não há sugestões
  const analisadas = refeicoesParaAnalise(refeicoes).length;
  if (analisadas < MIN_REFEICOES) {
    return (
      <p className="goal-sugestoes-nota">
        Registre pelo menos {MIN_REFEICOES} refeições para receber sugestões de metas a partir do que {filho.nome} come.
        {analisadas > 0 ? ` Já tem ${analisadas}.` : ''}
      </p>
    );
  }
  if (!sugestoes.length) return null;

  function criar(s: SugestaoMeta) {
    limparMetaEdicaoId();
    guardarMetaSugerida({ alimento: s.alimento, titulo: s.titulo, descricao: s.descricao, dias: s.dias, cor: GRUPOS[s.grupo].cor });
    navigate('/adicionar-meta');
  }

  function agoraNao(s: SugestaoMeta) {
    const novas = { ...ocultas, [s.id]: Date.now() };
    setOcultas(novas);
    salvarOcultas(filho.id, novas);
  }

  return (
    <section className="goal-sugestoes" aria-label="Metas sugeridas">
      <h2 className="goal-sugestoes-titulo"><Icone nome="mdi:lightbulb-on-outline" cor="2f6b47" tamanho={20} />Metas sugeridas</h2>
      <p className="goal-sugestoes-sub">Com base nas últimas {analisadas} refeições registradas</p>
      {sugestoes.map((s) => (
        <div key={s.id} className="goal-sugestao" style={{ borderLeftColor: GRUPOS[s.grupo].cor }}>
          <span className="goal-sugestao-grupo" style={{ background: GRUPOS[s.grupo].cor }}>
            {s.motivo === 'ultraprocessados' ? 'Ultraprocessados' : GRUPOS[s.grupo].nome}
          </span>
          <p className="goal-sugestao-msg">{s.mensagem}</p>
          <p className="goal-sugestao-convite">{s.convite}</p>
          <div className="goal-sugestao-acoes">
            <button className="goal-sugestao-criar" type="button" onClick={() => criar(s)}>Criar esta meta</button>
            <button className="goal-sugestao-depois" type="button" onClick={() => agoraNao(s)}>Agora não</button>
          </div>
        </div>
      ))}
    </section>
  );
}
