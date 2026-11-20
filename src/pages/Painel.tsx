import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PainelJogos, PainelMetas, PainelRefeicoes, TelaPainel } from '../components/Paineis';
import RecadoPersonagem from '../components/RecadoPersonagem';
import type { AbaPainel } from '../components/Paineis';
import { inicioDoPeriodo, partidasDoPeriodo, resumirMetas, resumirPartidas, resumirRefeicoes } from '../lib/painel';
import type { DiasPainel } from '../lib/painel';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import { codigoDoErro } from '../services/erros';
import { listarMetas, sincronizarMetas } from '../services/metas';
import { listarPartidas } from '../services/partidas';
import { listarRefeicoesDesde } from '../services/refeicoes';
import type { Meta, Partida, Refeicao } from '../types';

// Painel de acompanhamento do pequeno: gráficos das refeições, dos minijogos e das metas.
// Cada aba busca os dados só quando é aberta pela primeira vez.
export default function Painel() {
  usePagina('Painel de acompanhamento', 'home-page', '#6fa981');
  const [filho] = useFilhoAtivo();
  const [busca] = useSearchParams();
  // /painel?aba=jogos abre direto nos minijogos (o antigo endereço /desempenho vem para cá)
  const [aba, setAba] = useState<AbaPainel>(() => (busca.get('aba') === 'jogos' ? 'jogos' : busca.get('aba') === 'metas' ? 'metas' : 'refeicoes'));
  const [dias, setDias] = useState<DiasPainel>(7);
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null);
  const [partidas, setPartidas] = useState<Partida[] | null>(null);
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [erros, setErros] = useState<Partial<Record<AbaPainel, string>>>({});

  const filhoId = filho?.id;
  const filhoNome = filho?.nome;

  useEffect(() => {
    if (!filhoId) return;
    let ativo = true;
    const falhou = (qual: AbaPainel, texto: string) => (err: unknown) => {
      console.error(`Falha ao carregar o painel (${qual}):`, err);
      if (!ativo) return;
      setErros((e) => ({
        ...e,
        [qual]: codigoDoErro(err) === 'permission-denied' ? 'O Firebase recusou o acesso a esses dados. Confira as regras publicadas (firestore.rules).' : texto
      }));
    };

    if (aba === 'refeicoes' && refeicoes === null) {
      // busca de uma vez os últimos 30 dias: trocar o período depois não precisa buscar de novo
      listarRefeicoesDesde(filhoId, inicioDoPeriodo(30))
        .then((lista) => { if (ativo) setRefeicoes(lista); })
        .catch(falhou('refeicoes', 'Não foi possível carregar as refeições agora.'));
    }
    if (aba === 'jogos' && partidas === null) {
      listarPartidas(filhoId)
        .then((lista) => { if (ativo) setPartidas(lista); })
        .catch(falhou('jogos', 'Não foi possível carregar os minijogos agora.'));
    }
    if (aba === 'metas' && metas === null) {
      // deixa o progresso em dia com as refeições (como na tela de metas); se falhar, mostra o que está salvo
      sincronizarMetas(filhoId, filhoNome)
        .then((r) => r.metas)
        .catch((e) => { console.error(e); return listarMetas(filhoId); })
        .then((lista) => { if (ativo) setMetas(lista); })
        .catch(falhou('metas', 'Não foi possível carregar as metas agora.'));
    }
    return () => { ativo = false; };
  }, [aba, filhoId, filhoNome, refeicoes, partidas, metas]);

  const resumoRefeicoes = useMemo(() => (refeicoes ? resumirRefeicoes(refeicoes, dias) : null), [refeicoes, dias]);
  const resumoJogos = useMemo(() => (partidas ? resumirPartidas(partidas, dias) : null), [partidas, dias]);
  const partidasNoPeriodo = useMemo(() => (partidas ? partidasDoPeriodo(partidas, dias) : []), [partidas, dias]);
  const resumoMetas = useMemo(() => (metas ? resumirMetas(metas) : null), [metas]);

  useTutorialDaTela('painel', refeicoes !== null || partidas !== null || metas !== null || Object.keys(erros).length > 0); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  let conteudo = null;
  // o recado do personagem da criança (Luca ou Alice) fica no topo das refeições e sempre olha os últimos 7 dias
  if (aba === 'refeicoes' && resumoRefeicoes && refeicoes) conteudo = <><RecadoPersonagem refeicoes={refeicoes} filho={filho} /><PainelRefeicoes resumo={resumoRefeicoes} nome={filho.nome} /></>;
  if (aba === 'jogos' && resumoJogos) conteudo = <PainelJogos resumo={resumoJogos} partidas={partidasNoPeriodo} />;
  if (aba === 'metas' && resumoMetas) conteudo = <PainelMetas resumo={resumoMetas} />;

  return (
    <TelaPainel
      filho={filho}
      aba={aba}
      aoTrocarAba={setAba}
      dias={dias}
      aoTrocarDias={setDias}
      carregando={!conteudo}
      erro={erros[aba] || ''}
    >
      {conteudo}
    </TelaPainel>
  );
}
