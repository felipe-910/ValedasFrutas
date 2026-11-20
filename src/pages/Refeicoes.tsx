import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import BotoesTipoRefeicao from '../components/BotoesTipoRefeicao';
import BuscaAlimento from '../components/BuscaAlimento';
import Icone from '../components/Icone';
import { useToast } from '../context/ToastContext';
import { useCatalogoAlimentos } from '../lib/useCatalogoAlimentos';
import { lerRefeicaoEmEdicao, limparRefeicaoEmEdicao } from '../lib/sessao';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import { mensagemPerdas, sincronizarMetas } from '../services/metas';
import { addRefeicao, updateRefeicao } from '../services/refeicoes';
import type { Alimento, AlimentoCatalogo, StatusRefeicao, TipoRefeicao } from '../types';

const STATUS_OPCOES: Array<{ id: StatusRefeicao; rotulo: string }> = [
  { id: 'completa', rotulo: 'Completa' },
  { id: 'metade', rotulo: 'Pela metade' },
  { id: 'nao_comeu', rotulo: 'Não comeu' }
];

const LETRAS_ARCO_IRIS = 'Tipos de refeições'.split('');

// Cada letra (sem contar os espaços) ganha uma das cinco cores do arco-íris, em sequência
function letrasColoridas() {
  let n = 0;
  return LETRAS_ARCO_IRIS.map((letra, i) =>
    letra === ' ' ? ' ' : <span key={i} className={`rc${(n++ % 5) + 1}`}>{letra}</span>
  );
}

export default function Refeicoes() {
  usePagina('Registrar refeições', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [filho] = useFilhoAtivo();
  const catalogo = useCatalogoAlimentos();

  const [emEdicao] = useState(() => lerRefeicaoEmEdicao());
  const [tipo, setTipo] = useState<TipoRefeicao | null>(emEdicao ? emEdicao.tipo : null);
  const [status, setStatus] = useState<StatusRefeicao | null>(emEdicao?.status ?? null);
  const [alimentos, setAlimentos] = useState<Alimento[]>(() => (emEdicao ? [...emEdicao.alimentos] : []));
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);

  useTutorialDaTela('refeicoes'); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  function adicionarAlimento(item: Alimento) {
    setAlimentos((atual) => [...atual, item]);
    setBusca('');
  }

  function adicionarDigitado() {
    const nome = busca.trim();
    if (!nome) return;
    const achado = catalogo.find((f) => f.nome.toLowerCase() === nome.toLowerCase());
    adicionarAlimento(achado ? { nome: achado.nome, icone: achado.icone } : { nome, icone: 'mdi:food-variant' });
  }

  function editarAlimento(indice: number) {
    const item = alimentos[indice];
    const novo = prompt('Editar alimento:', item.nome);
    if (novo && novo.trim()) {
      setAlimentos((atual) => atual.map((a, i) => (i === indice ? { nome: novo.trim(), icone: item.icone } : a)));
    }
  }

  async function salvar() {
    if (!filho) return;
    if (!tipo) { mostrarToast('Escolha o tipo de refeição.'); return; }
    if (!alimentos.length) { mostrarToast('Adicione pelo menos um alimento.'); return; }
    if (!status) { mostrarToast('Informe como a criança comeu a refeição.'); return; }

    setSalvando(true);
    try {
      if (emEdicao) {
        await updateRefeicao(emEdicao.id, { tipo, alimentos, status });
      } else {
        await addRefeicao({ filhoId: filho.id, tipo, alimentos, status });
      }
      limparRefeicaoEmEdicao();

      // Atualiza as metas de refeição/alimento ligadas a esse registro
      let espera = 0;
      try {
        const { ganhos, perdas, xpGeral } = await sincronizarMetas(filho.id, filho.nome);
        const mensagens: string[] = [];
        if (ganhos.length) {
          const xp = ganhos.reduce((soma, g) => soma + g.xp, 0);
          const concluidas = ganhos.filter((g) => g.concluida).length;
          mensagens.push(concluidas ? `+${xp} XP! ${concluidas === 1 ? 'Uma meta foi concluída' : 'Metas concluídas: ' + concluidas}${xpGeral > 0 ? ` e o XP geral subiu +${xpGeral}` : ''}.` : `+${xp} XP para as metas!`);
          espera = 1600;
        }
        if (perdas.length) {
          // editar a refeição (ex.: trocar o tipo) pode tirar um dia de uma meta: avisa em vez de mudar em silêncio
          mensagens.push(mensagemPerdas(perdas));
          espera = 4000;
        }
        if (mensagens.length) mostrarToast(mensagens.join(' '), perdas.length ? 4500 : 2200);
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => navigate('/lista-refeicoes'), espera);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível salvar a refeição.');
      setSalvando(false);
    }
  }

  return (
    <>
      <BarraTopo titulo={emEdicao ? 'Editar refeição' : 'Registrar refeições'} voltarPara="/lista-refeicoes" />

      <div className="child-body">
        <h2 className="sticker-line rainbow-text">
          {letrasColoridas()}
        </h2>

        <BotoesTipoRefeicao selecionados={tipo ? [tipo] : []} aoEscolher={setTipo} />

        <BuscaAlimento
          id="buscarAlimento"
          placeholder="Buscar alimento..."
          valor={busca}
          aoMudar={setBusca}
          aoEscolher={(f: AlimentoCatalogo) => adicionarAlimento({ nome: f.nome, icone: f.icone })}
          aoApertarEnter={adicionarDigitado}
        />

        <p className="food-list-label">Alimentos adicionados</p>
        <div className="food-list">
          {alimentos.map((item, idx) => (
            <div className="food-item" key={`${item.nome}-${idx}`}>
              <span className="food-icon"><Icone nome={item.icone || 'mdi:food-variant'} cor="6fa981" tamanho={18} /></span>
              <span className="food-name">{item.nome}</span>
              <button className="icon-action edit" type="button" aria-label="Editar" onClick={() => editarAlimento(idx)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              </button>
              <button className="icon-action delete" type="button" aria-label="Remover" onClick={() => setAlimentos((atual) => atual.filter((_, i) => i !== idx))}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M6 4V2.5H10V4M4.5 4L5 14H11L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ))}
        </div>
        <p className="empty-note" style={{ display: alimentos.length ? 'none' : 'block' }}>Nenhum alimento adicionado ainda.</p>

        <p className="food-list-label">Como a criança comeu?</p>
        <div className="meal-status-options">
          {STATUS_OPCOES.map((o) => (
            <button key={o.id} className={`meal-status-btn${status === o.id ? ' selected' : ''}`} type="button" onClick={() => setStatus(o.id)}>
              {o.rotulo}
            </button>
          ))}
        </div>

        <button className="cta" type="button" disabled={salvando} onClick={salvar}>Salvar refeições</button>
      </div>
    </>
  );
}
