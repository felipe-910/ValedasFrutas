import { useEffect, useState } from 'react';
import Icone from '../components/Icone';
import { Navigate, useNavigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import BotoesTipoRefeicao from '../components/BotoesTipoRefeicao';
import BuscaAlimento from '../components/BuscaAlimento';
import GradeCores from '../components/GradeCores';
import { useToast } from '../context/ToastContext';
import { CORES_META } from '../lib/cores';
import { lerMetaEdicaoId, limparMetaEdicaoId } from '../lib/sessao';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import { addMeta, calcularXpMeta, editarMeta, obterMeta, refeicoesDaMeta } from '../services/metas';
import { codigoDoErro, mensagemDoErro } from '../services/erros';
import { TIPOS_REFEICAO } from '../types';
import type { Meta, TipoMeta, TipoRefeicao } from '../types';

const TIPOS_META: Array<{ id: TipoMeta; titulo: string; texto: string }> = [
  { id: 'simples', titulo: 'Meta simples', texto: 'Uma tarefa que você marca como concluída.' },
  { id: 'refeicao', titulo: 'Meta de refeição', texto: 'A criança ganha XP quando completa as refeições escolhidas (uma, várias ou todas).' },
  { id: 'alimento', titulo: 'Meta de alimento', texto: 'A criança ganha XP quando come um alimento em uma refeição completa.' }
];

const RECOMPENSAS: Array<{ nome: string; cor: string; icone: string }> = [
  { nome: 'Bombom', cor: '#f2726c', icone: 'mdi:candy' },
  { nome: 'Livro novo', cor: '#6fa981', icone: 'mdi:book-open-variant' },
  { nome: 'Adesivos', cor: '#5b5ea6', icone: 'mdi:sticker-emoji' },
  { nome: 'Brinquedos', cor: '#f4a53b', icone: 'mdi:toy-brick' },
  { nome: 'Sorvete', cor: '#f2a6a2', icone: 'mdi:ice-cream' },
  { nome: 'Passeio no parque', cor: '#9cd1e0', icone: 'mdi:slide' },
  { nome: 'Filme em família', cor: '#b0699e', icone: 'mdi:movie-open' },
  { nome: 'Tempo extra de jogo', cor: '#9bc7a0', icone: 'mdi:gamepad-variant' },
  { nome: 'Passeio de bicicleta', cor: '#e6c199', icone: 'mdi:bike' }
];

export default function AdicionarMeta() {
  usePagina('Adicionar meta', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [filho] = useFilhoAtivo();

  // Modo de edição: vem de Metas (botão "Editar") com o id da meta
  const [metaEdicaoId] = useState(() => lerMetaEdicaoId());
  const [metaEmEdicao, setMetaEmEdicao] = useState<Meta | null>(null);

  const [passo, setPasso] = useState<1 | 2>(1);
  const [tipo, setTipo] = useState<TipoMeta>('simples');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [refeicoes, setRefeicoes] = useState<TipoRefeicao[]>([]);
  const [alimento, setAlimento] = useState('');
  const [dias, setDias] = useState('');
  const [cor, setCor] = useState('#f2726c');
  const [recompensa, setRecompensa] = useState('');
  const [salvando, setSalvando] = useState(false);

  // ---------- Modo de edição: carrega a meta e preenche o formulário ----------
  useEffect(() => {
    if (!metaEdicaoId) return;
    let ativo = true;
    (async () => {
      try {
        const meta = await obterMeta(metaEdicaoId);
        if (!ativo) return;
        if (!meta) {
          limparMetaEdicaoId();
          mostrarToast('Meta não encontrada.');
          setTimeout(() => navigate('/metas'), 1200);
          return;
        }
        setMetaEmEdicao(meta);
        setTipo(meta.tipo || 'simples'); // o tipo da meta não muda: os outros cartões ficam travados
        setTitulo(meta.titulo || '');
        setDescricao(meta.descricao || '');
        if (meta.tipo === 'refeicao') setRefeicoes(refeicoesDaMeta(meta));
        if (meta.tipo === 'alimento') setAlimento(meta.alimento || '');
        if (meta.tipo !== 'simples') setDias(meta.dias ? String(meta.dias) : '');
        setCor(meta.cor || '#f2726c');
        setRecompensa(meta.recompensa || '');
      } catch (err) {
        console.error(err);
        mostrarToast('Não foi possível carregar a meta.');
      }
    })();
    return () => { ativo = false; };
  }, [metaEdicaoId, navigate, mostrarToast]);

  useTutorialDaTela('adicionar-meta'); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  const diasNumero = parseInt(dias, 10);
  const todasMarcadas = refeicoes.length === TIPOS_REFEICAO.length;

  function alternarRefeicao(t: TipoRefeicao) {
    setRefeicoes((atual) => (atual.includes(t) ? atual.filter((x) => x !== t) : [...atual, t]));
  }

  // Prévia do XP calculado pelo sistema
  function textoPrevia(): string {
    if (!diasNumero || diasNumero < 1) return 'Informe os dias e o sistema calcula o XP.';
    const { xpPorDia, xpTotal } = calcularXpMeta({ tipo, qtdRefeicoes: refeicoes.length, dias: diasNumero });
    return xpTotal ? `Esta meta vale ${xpTotal} XP (${xpPorDia} XP por dia).` : 'Escolha as refeições para ver o XP.';
  }

  // Nome automático quando o pai não digita um título
  function tituloAutomatico(): string {
    if (tipo === 'refeicao') {
      const lista = TIPOS_REFEICAO.filter((t) => refeicoes.includes(t));
      if (lista.length === TIPOS_REFEICAO.length) return 'Completar todas as refeições';
      if (lista.length === 1) return `Completar ${lista[0].toLowerCase()}`;
      return `Completar ${lista.slice(0, -1).map((t) => t.toLowerCase()).join(', ')} e ${lista[lista.length - 1].toLowerCase()}`;
    }
    return `Comer ${alimento.trim()}`;
  }

  function irParaRecompensa() {
    if (!titulo.trim() && tipo === 'simples') { mostrarToast('Digite qual é a meta.'); return; }
    if (tipo === 'refeicao' && !refeicoes.length) { mostrarToast('Escolha pelo menos uma refeição.'); return; }
    if (tipo === 'alimento' && !alimento.trim()) { mostrarToast('Informe o alimento da meta.'); return; }
    if (tipo !== 'simples' && (!diasNumero || diasNumero < 1)) { mostrarToast('Informe por quantos dias.'); return; }
    setPasso(2);
  }

  async function salvar() {
    if (!filho) return;
    const tituloFinal = titulo.trim() || tituloAutomatico();
    const recompensaFinal = recompensa.trim();
    if (!recompensaFinal) { mostrarToast('Digite a recompensa da meta.'); return; }
    if (metaEdicaoId && !metaEmEdicao) { mostrarToast('Ainda carregando a meta. Tente de novo em instantes.'); return; }

    const extras = tipo === 'simples' ? {} : {
      dias: diasNumero,
      ...(tipo === 'refeicao'
        ? { tiposRefeicao: TIPOS_REFEICAO.filter((t) => refeicoes.includes(t)) }
        : { alimento: alimento.trim() })
    };

    setSalvando(true);
    try {
      if (metaEmEdicao) {
        await editarMeta(metaEmEdicao, { titulo: tituloFinal, descricao: descricao.trim(), cor, recompensa: recompensaFinal, ...extras }, filho.nome);
        limparMetaEdicaoId();
        mostrarToast('Meta atualizada!');
      } else {
        await addMeta({ filhoId: filho.id, filhoNome: filho.nome, titulo: tituloFinal, descricao: descricao.trim(), cor, recompensa: recompensaFinal, tipo, ...extras });
        mostrarToast('Meta criada com sucesso!');
      }
      setTimeout(() => navigate('/metas'), 800);
    } catch (err) {
      console.error(err);
      mostrarToast(codigoDoErro(err) === 'permission-denied'
        ? 'Sem permissão para salvar (verifique as regras do Firestore).'
        : `Não foi possível salvar a meta. ${mensagemDoErro(err) || ''}`);
      setSalvando(false);
    }
  }

  return (
    <>
      <BarraTopo titulo={metaEmEdicao ? 'Editar meta' : 'Adicionar meta'} voltarPara="/metas" />

      <div className="child-body">
        <div className="step-indicator">
          <div className="step-node">
            <div className={`step-circle${passo === 1 ? ' active' : ''}`}>1</div>
            <span className="step-label active">Meta</span>
          </div>
          <div className={`step-line${passo === 2 ? ' active' : ''}`} />
          <div className="step-node">
            <div className={`step-circle${passo === 2 ? ' active' : ''}`}>2</div>
            <span className={`step-label${passo === 2 ? ' active' : ''}`}>Recompensa</span>
          </div>
        </div>

        {/* Passo 1: Meta */}
        {passo === 1 && (
          <section>
            <p className="form-label">Tipo de meta</p>
            <div className="goal-type-options">
              {TIPOS_META.map((t) => (
                <button
                  key={t.id}
                  className={`goal-type-card${tipo === t.id ? ' selected' : ''}`}
                  type="button"
                  disabled={!!metaEmEdicao && tipo !== t.id}
                  onClick={() => setTipo(t.id)}
                >
                  <b>{t.titulo}</b>
                  <span>{t.texto}</span>
                </button>
              ))}
            </div>

            <label className="form-label" htmlFor="tituloMeta">Qual é a meta?</label>
            <input className="text-input" id="tituloMeta" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            {tipo !== 'simples' && (
              <p className="form-sub" style={{ marginTop: -10, marginBottom: 18 }}>Se deixar em branco, o sistema cria o nome da meta sozinho.</p>
            )}

            <label className="form-label" htmlFor="descMeta">Descrição da meta (Opcional)</label>
            <textarea className="textarea-input" id="descMeta" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

            {/* Meta de refeição */}
            {tipo === 'refeicao' && (
              <div>
                <p className="form-label" style={{ marginBottom: 2 }}>Quais refeições?</p>
                <p className="form-sub">Escolha uma, várias ou todas. O dia só conta quando todas as escolhidas forem completas.</p>
                <BotoesTipoRefeicao selecionados={refeicoes} aoEscolher={alternarRefeicao} estilo={{ marginTop: 0 }} />
                <button
                  className={`meal-all-btn${todasMarcadas ? ' active' : ''}`}
                  type="button"
                  onClick={() => setRefeicoes(todasMarcadas ? [] : [...TIPOS_REFEICAO])}
                >
                  {todasMarcadas ? 'Limpar seleção' : 'Selecionar todas as refeições'}
                </button>
              </div>
            )}

            {/* Meta de alimento */}
            {tipo === 'alimento' && (
              <div>
                <label className="form-label" htmlFor="alimentoMeta">Qual alimento?</label>
                <BuscaAlimento
                  id="alimentoMeta"
                  placeholder="Buscar ou digitar o alimento..."
                  valor={alimento}
                  aoMudar={setAlimento}
                  aoEscolher={(f) => setAlimento(f.nome)}
                  estilo={{ marginBottom: 22 }}
                />
              </div>
            )}

            {/* Dias e XP (refeição e alimento) */}
            {tipo !== 'simples' && (
              <div>
                <label className="form-label" htmlFor="diasMeta">Por quantos dias?</label>
                <input
                  className="text-input"
                  id="diasMeta"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  style={{ marginBottom: 10 }}
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                />
                <p className="xp-preview">{textoPrevia()}</p>
                <p className="form-sub" style={{ marginTop: 8, marginBottom: 22 }}>Você só informa os dias. O sistema define o XP, acompanha as refeições completas e conclui a meta sozinho no último dia.</p>
              </div>
            )}

            <p className="form-label" style={{ marginBottom: 2 }}>Cor da meta</p>
            <p className="form-sub">Escolha uma cor para identificar a sua meta</p>
            <GradeCores cores={CORES_META} selecionada={cor} aoEscolher={setCor} estilo={{ marginBottom: 26 }} />

            <button className="cta" type="button" onClick={irParaRecompensa}>Próximo</button>
          </section>
        )}

        {/* Passo 2: Recompensa */}
        {passo === 2 && (
          <section>
            <label className="form-label" htmlFor="recompensaMeta">Qual será a recompensa?</label>
            <p className="form-sub">Escolha uma recompensa que motive a criança!</p>
            <input className="text-input" id="recompensaMeta" type="text" style={{ marginBottom: 24 }} value={recompensa} onChange={(e) => setRecompensa(e.target.value)} />

            <p className="form-label" style={{ marginBottom: 12 }}>Sugestões</p>
            <div className="reward-suggestions">
              {RECOMPENSAS.map((r) => (
                <button
                  key={r.nome}
                  className={`reward-card${recompensa.trim() === r.nome ? ' selected' : ''}`}
                  style={{ background: r.cor }}
                  type="button"
                  onClick={() => setRecompensa(r.nome)}
                >
                  <Icone nome={r.icone} cor="ffffff" tamanho={28} />
                  <span>{r.nome}</span>
                </button>
              ))}
            </div>

            <button className="cta" type="button" disabled={salvando} onClick={salvar}>{metaEmEdicao ? 'Salvar alterações' : 'Salvar meta'}</button>
          </section>
        )}
      </div>
    </>
  );
}
