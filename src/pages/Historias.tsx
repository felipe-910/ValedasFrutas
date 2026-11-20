import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icone from '../components/Icone';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSenha } from '../context/SenhaContext';
import { useToast } from '../context/ToastContext';
import { calcularNivel, xpDoJogo } from '../lib/nivel';
import { usePagina } from '../lib/usePagina';
import { lerModoCrianca, sairModoCrianca } from '../services/modoCrianca';
import { ganharXp } from '../services/xp';
import { NOMES_JOGOS, registrarPartida } from '../services/partidas';
import type { DetalhesPartida, IdNarrador } from '../types';
import { Arbusto, Colinas, Nuvem, Sol } from '../components/CenarioHistorias';
// capas dos minigames (Alice e Luca com o tema de cada jogo)
import imgPrato from '../assets/capas/prato.jpg';
import imgSemaforo from '../assets/capas/semaforo.jpg';
import imgCesta from '../assets/capas/cesta.jpg';
import type { IdJogo } from '../types';

// Cada opção da tela abre um minigame (página própria em /jogos, aberta num iframe).
const JOGOS: ReadonlyArray<{ id: IdJogo; nome: string; descricao: string; url: string; imagem: string; fundo: string }> = [
  { id: 'cesta', nome: NOMES_JOGOS.cesta, descricao: 'Mova a cesta e pegue os alimentos que caem.', url: '/jogos/cesta.html', imagem: imgCesta, fundo: '#d9f0fb' },
  { id: 'semaforo', nome: NOMES_JOGOS.semaforo, descricao: 'Escolha a cor do semáforo de cada alimento.', url: '/jogos/semaforo.html', imagem: imgSemaforo, fundo: '#dcf3e0' },
  { id: 'prato', nome: NOMES_JOGOS.prato, descricao: 'Arraste os alimentos e monte um prato equilibrado.', url: '/jogos/prato.html', imagem: imgPrato, fundo: '#ffeccb' }
];

// "Histórias" com uma cor em cada letra
const LETRAS = [
  ['H', '#fe6e6d'], ['i', '#f5ab2c'], ['s', '#f9c846'], ['t', '#5aa56a'], ['ó', '#5e6fb8'],
  ['r', '#c47fb5'], ['i', '#8fd3e4'], ['a', '#5db39a'], ['s', '#96ccaa']
] as const;

export default function Historias() {
  usePagina('Histórias', 'historias-page', '#9dd4d1');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const { user } = useAuth();
  const { pedirSenhaDosPais } = useSenha();

  // ninguém abriu o modo criança (ou a senha já foi digitada): volta para a área dos pais
  const [modo] = useState(() => lerModoCrianca());
  const [menuAberto, setMenuAberto] = useState(false);
  const [jogoAberto, setJogoAberto] = useState<number | null>(null);
  const quadro = useRef<HTMLIFrameElement>(null);
  const tela = useRef<HTMLElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const tituloTexto = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // "Olá, Alice!" usa só o primeiro nome
  const primeiroNome = (modo?.nome || '').trim().split(/\s+/)[0] || 'amiguinho';

  // Nomes grandes diminuem a letra para o título nunca passar do espaço disponível
  const ajustarTitulo = useCallback(() => {
    const t = tela.current;
    const h = titulo.current;
    const texto = tituloTexto.current;
    if (!t || !h || !texto) return;
    const largura = t.clientWidth;
    let tamanho = Math.min(58, Math.max(28, largura * 0.088));
    const disponivel = Math.min(largura * 0.6, 620);
    h.style.fontSize = `${tamanho}px`;
    while (texto.offsetWidth > disponivel && tamanho > 14) {
      tamanho -= 1;
      h.style.fontSize = `${tamanho}px`;
    }
  }, []);

  useLayoutEffect(() => {
    ajustarTitulo();
    window.addEventListener('resize', ajustarTitulo);
    if (document.fonts && document.fonts.ready) void document.fonts.ready.then(ajustarTitulo);
    return () => window.removeEventListener('resize', ajustarTitulo);
  }, [ajustarTitulo, primeiroNome]);

  // A conta precisa ser a mesma que abriu o modo criança
  useEffect(() => {
    if (modo && user && modo.uid !== user.uid) {
      sairModoCrianca();
      navigate('/home', { replace: true });
    }
  }, [modo, user, navigate]);

  // O botão "voltar" do navegador não leva para a área dos pais
  useEffect(() => {
    window.history.pushState(window.history.state, '', window.location.href);
    const prender = () => window.history.pushState(window.history.state, '', window.location.href);
    window.addEventListener('popstate', prender);
    return () => window.removeEventListener('popstate', prender);
  }, []);

  // Menu: fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!menuAberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setMenuAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false); };
    document.addEventListener('click', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('click', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [menuAberto]);

  // O minigame avisa (postMessage) quando a partida termina ou quando a criança pede para voltar
  const filhoId = modo?.filhoId;
  useEffect(() => {
    if (jogoAberto === null) return;
    const aoReceber = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (!quadro.current || e.source !== quadro.current.contentWindow) return;
      const msg = e.data as { origem?: string; tipo?: string; jogo?: string; estrelas?: number; resumo?: string; narrador?: IdNarrador | null; detalhes?: DetalhesPartida | null } | null;
      if (!msg || msg.origem !== 'vale-jogos') return;

      if (msg.tipo === 'sair') {
        setJogoAberto(null);
      } else if (msg.tipo === 'fim' && filhoId) {
        const ganho = xpDoJogo(Number(msg.estrelas));
        const jogo = JOGOS.find((j) => j.id === msg.jogo)?.id;
        // guarda a partida (aparece no Painel > Minijogos) (jogo, data, hora e como a criança se saiu)
        if (jogo) {
          registrarPartida({ filhoId, jogo, estrelas: Number(msg.estrelas), resumo: String(msg.resumo || ''), xp: ganho, narrador: msg.narrador, detalhes: msg.detalhes })
            .catch((err) => {
              console.error('Falha ao salvar a partida:', err);
              // espera o aviso de XP sair da tela para este não ser coberto
              setTimeout(() => mostrarToast('Esta partida não foi salva no painel.', 3500), 3400);
            });
        }
        ganharXp(filhoId, ganho)
          .then(({ xpAntes, xpDepois }) => {
            const subiu = calcularNivel(xpDepois).nivel > calcularNivel(xpAntes).nivel;
            mostrarToast(subiu ? `+${ganho} XP! Você chegou ao nível ${calcularNivel(xpDepois).nivel}!` : `+${ganho} XP!`, 3200);
          })
          .catch((err) => {
            console.error('Falha ao salvar o XP:', err);
            mostrarToast('Não foi possível salvar o XP agora.');
          });
      }
    };
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [jogoAberto, filhoId, mostrarToast]);

  async function voltarParaPais() {
    setMenuAberto(false);
    const ok = await pedirSenhaDosPais();
    if (!ok) return;
    sairModoCrianca();
    navigate('/home', { replace: true });
  }

  if (!modo) return <Navigate to="/home" replace />;

  return (
    <main className="hist-tela" ref={tela} aria-labelledby="titulo">
      <header className="hist-topo">
        <div className="hist-deco hist-nuvem hist-nuvem--a"><Nuvem /></div>
        <div className="hist-deco hist-nuvem hist-nuvem--b"><Nuvem /></div>
        <div className="hist-deco hist-sol"><Sol /></div>
        <div className="hist-deco hist-colinas"><Colinas /></div>
        <div className="hist-deco hist-arbusto hist-arbusto--e"><Arbusto /></div>
        <div className="hist-deco hist-arbusto hist-arbusto--d"><Arbusto /></div>

        <div className="hist-textos">
          <h1 className="hist-titulo" id="titulo" ref={titulo}>
            <span ref={tituloTexto}>Olá, <span>{primeiroNome}</span><span className="hist-exclamacao">!</span></span>
          </h1>
          <p className="hist-sub">Que bom ter você aqui!</p>
        </div>

        <button
          className="hist-menu-btn"
          type="button"
          aria-label="Abrir menu"
          aria-haspopup="true"
          aria-expanded={menuAberto}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAberto((aberto) => !aberto);
          }}
        >
          <span /><span /><span />
        </button>
        {menuAberto && (
          <div className="hist-menu" ref={menu}>
            <button className="hist-menu-item" type="button" onClick={voltarParaPais}>
              <Icone nome="mdi:lock-outline" cor="4f9366" />
              Área dos pais
            </button>
          </div>
        )}
      </header>

      <section className="hist-corpo" aria-labelledby="hist-secao">
        <h2 className="hist-pill" id="hist-secao">
          {/* o contorno branco fica numa camada só, atrás das letras coloridas (assim uma letra não apaga a outra) */}
          <span className="hist-pill-fundo" aria-hidden="true">Histórias</span>
          <span className="hist-pill-letras">
            {LETRAS.map(([letra, cor], i) => <span key={i} style={{ color: cor }}>{letra}</span>)}
          </span>
        </h2>

        <div className="hist-lista" aria-label="Escolha uma história">
          {JOGOS.map((jogo, i) => (
            <button
              key={jogo.id}
              className="hist-cartao"
              type="button"
              aria-label={`Abrir história ${i + 1}: ${jogo.nome}`}
              onClick={() => setJogoAberto(i)}
            >
              <img className="hist-cartao-capa" src={jogo.imagem} alt="" style={{ background: jogo.fundo }} />
              <span className="hist-cartao-rodape">
                <span className="hist-cartao-texto">
                  <span className="hist-cartao-nome">{jogo.nome}</span>
                  <span className="hist-cartao-desc">{jogo.descricao}</span>
                </span>
                <span className="hist-cartao-jogar" aria-hidden="true">Jogar ▶</span>
              </span>
            </button>
          ))}
        </div>

      </section>

      {jogoAberto !== null && (
        <iframe
          ref={quadro}
          className="jogo-frame"
          src={JOGOS[jogoAberto].url}
          title={JOGOS[jogoAberto].nome}
        />
      )}
    </main>
  );
}
