import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Arbusto, Colinas, Nuvem, Sol } from '../components/CenarioHistorias';
import Icone from '../components/Icone';
import LetrasColoridas from '../components/LetrasColoridas';
import { useAuth } from '../context/AuthContext';
import { useSenha } from '../context/SenhaContext';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import { CORES_CARD_HOME, corDaBorda } from '../lib/cores';
import { textoIdade } from '../lib/idade';
import { guardarFilhoAtivo, lerPerfilLocal } from '../lib/sessao';
import { usePagina } from '../lib/usePagina';
import { logoutUser, temSenha, usuarioAtual } from '../services/auth';
import { listarFilhos } from '../services/filhos';
import { sincronizarTodasAsMetas } from '../services/metas';
import { iniciarModoCrianca } from '../services/modoCrianca';
import { contarNaoLidas, verificarPrazos } from '../services/notificacoes';
import type { Filho, FilhoAtivo } from '../types';

function paraFilhoAtivo(filho: Filho, cor: string): FilhoAtivo {
  return { id: filho.id, nome: filho.nome, idade: filho.idade, dataNascimento: filho.dataNascimento, avatar: filho.avatar, cor, xp: filho.xp };
}

export default function Home() {
  usePagina('Vale das Frutas', 'home-page', '#8fe3e0');
  const { user } = useAuth();
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const { criarSenhaDosPais } = useSenha();

  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [carregou, setCarregou] = useState(false);
  const location = useLocation();
  const tutorial = useTutorial();
  const [naoLidas, setNaoLidas] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

  const nomeResponsavel = user?.displayName || 'Responsável';
  // no topo vai só o primeiro nome, como na tela de histórias ("Olá, Felipe!")
  const primeiroNome = nomeResponsavel.trim().split(/\s+/)[0] || 'Responsável';

  // Nomes grandes diminuem a letra para o "Olá, nome!" nunca passar do espaço entre o menu e o sininho
  const topo = useRef<HTMLElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const tituloTexto = useRef<HTMLSpanElement>(null);
  const ajustarTitulo = useCallback(() => {
    const t = topo.current;
    const h = titulo.current;
    const texto = tituloTexto.current;
    if (!t || !h || !texto) return;
    const largura = t.clientWidth;
    let tamanho = Math.min(56, Math.max(28, largura * 0.095));
    const disponivel = Math.min(largura - 2 * Math.max(70, largura * 0.17), 620);
    h.style.fontSize = `${tamanho}px`;
    while (texto.offsetWidth > disponivel && tamanho > 16) {
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
  const fotoSalva = user ? lerPerfilLocal(user.uid, 'foto') : null;
  const fotoConta = fotoSalva || user?.photoURL || null;

  // Carrega os pequenos
  useEffect(() => {
    let ativo = true;
    listarFilhos()
      .then((lista) => { if (ativo) setFilhos(lista); })
      .catch((err) => {
        console.error(err);
        mostrarToast('Não foi possível carregar os pequenos.');
      })
      .finally(() => { if (ativo) setCarregou(true); });
    return () => { ativo = false; };
  }, [mostrarToast]);

  // Tutorial: conta nova -> no primeiro acesso a Alice mostra o sistema (obrigatório). Depois, só pelo menu.
  function comecarTutorial() {
    const primeiro = filhos[0];
    tutorial.iniciar(primeiro ? paraFilhoAtivo(primeiro, primeiro.cor || CORES_CARD_HOME[0]) : null);
  }
  useEffect(() => {
    if (!carregou || !tutorial.contaPronta || tutorial.ativo) return;
    const pediu = (location.state as { tutorial?: boolean } | null)?.tutorial === true; // veio do Perfil
    if (!pediu && !tutorial.podeMostrar('geral')) return;
    if (pediu) navigate('/home', { replace: true, state: null }); // recarregar a página não abre de novo
    comecarTutorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregou, tutorial.contaPronta]);

  function verTutorial() {
    setMenuAberto(false);
    tutorial.reverTudo();
    comecarTutorial();
  }

  // Confere os prazos das metas e mostra a bolinha com a quantidade de notificações novas no sininho
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        // a bolinha aparece na hora; metas e prazos (a parte demorada) vêm depois e atualizam o número
        const qtd = await contarNaoLidas();
        if (ativo) setNaoLidas(qtd);
        await sincronizarTodasAsMetas(); // deixa o progresso das metas em dia antes de conferir os prazos
        await verificarPrazos();
        const atualizado = await contarNaoLidas();
        if (ativo) setNaoLidas(atualizado);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { ativo = false; };
  }, []);

  // › abre a área da criança (histórias). Para voltar à área dos pais é preciso digitar a senha.
  async function abrirAreaDaCrianca(filho: Filho, cor: string) {
    if (!temSenha()) {
      // quem entrou com o Google ainda não tem senha: precisa criar uma antes
      const criou = await criarSenhaDosPais();
      if (!criou) {
        mostrarToast('Crie uma senha para abrir a área da criança.');
        return;
      }
    }
    const atual = usuarioAtual();
    if (!atual) return;
    iniciarModoCrianca(atual.uid, paraFilhoAtivo(filho, cor));
    navigate('/historias');
  }

  function entrar(filho: Filho, cor: string) {
    guardarFilhoAtivo(paraFilhoAtivo(filho, cor));
    navigate('/crianca');
  }

  async function sair() {
    await logoutUser();
    navigate('/');
  }

  return (
    <>
      {/* topo no mesmo estilo da tela de histórias: céu, sol, nuvens, colinas com cachoeira e arbustos */}
      <header className="hist-topo home-topo" ref={topo}>
        <div className="hist-deco hist-nuvem hist-nuvem--a"><Nuvem /></div>
        <div className="hist-deco hist-nuvem hist-nuvem--b"><Nuvem /></div>
        <div className="hist-deco hist-sol"><Sol /></div>
        <div className="hist-deco hist-colinas"><Colinas /></div>
        <div className="hist-deco hist-arbusto hist-arbusto--e"><Arbusto /></div>
        <div className="hist-deco hist-arbusto hist-arbusto--d"><Arbusto /></div>

        <div className="hist-textos home-textos">
          {/* "Olá, nome!" com a mesma fonte e cor de antes (verde-escuro com contorno branco) */}
          <h1 className="home-ola" ref={titulo}>
            <span className="sticker-line on-green home-ola-texto" ref={tituloTexto}>Olá, <span>{primeiroNome}</span>!</span>
          </h1>
          <p className="hist-sub">Que bom ter você aqui!</p>
        </div>

        <button className="hist-menu-btn" aria-label="Menu" type="button" data-tutorial="menu" onClick={() => setMenuAberto(true)}>
          <span /><span /><span />
        </button>
        <button className="hist-menu-btn home-sino-btn" aria-label="Notificações" type="button" data-tutorial="sininho" onClick={() => navigate('/notificacoes')}>
          <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden="true">
            <path d="M11 24c1.66 0 3-1.34 3-3H8c0 1.66 1.34 3 3 3zm8-7V10c0-4.07-2.13-7.44-6-8.33V1a2 2 0 10-4 0v.67C5.13 2.56 3 5.92 3 10v7l-2 2v1h20v-1l-2-2z" fill="#fff" />
          </svg>
          {naoLidas > 0 && <span className="bell-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
        </button>
      </header>

      {menuAberto && (
        <div className="account-overlay">
          <button className="overlay-close" type="button" aria-label="Fechar" onClick={() => setMenuAberto(false)}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M2 2L20 20M20 2L2 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="account-header">
            <div className="account-avatar" style={fotoConta ? { backgroundImage: `url('${fotoConta}')` } : undefined} />
            <div className="account-id">
              <span className="account-name">{nomeResponsavel}</span>
              <span className="account-email">{user?.email || ''}</span>
            </div>
          </div>
          <div className="account-menu-list">
            <button className="account-card" type="button" style={{ borderColor: '#bfe0cb' }} onClick={() => navigate('/perfil')}>
              <span className="account-card-icon" style={{ color: '#6fa981' }}><Icone nome="mdi:account-outline" cor="6fa981" tamanho={26} /></span>
              <span className="account-card-text">
                <span className="account-card-title">Perfil</span>
                <span className="account-card-sub">Gerencie suas informações</span>
              </span>
              <span className="account-card-chevron">&#8250;</span>
            </button>
            <button className="account-card" type="button" style={{ borderColor: '#f6dcb0' }} onClick={verTutorial}>
              <span className="account-card-icon" style={{ color: '#e0a33a' }}><Icone nome="mdi:help-circle-outline" cor="e0a33a" tamanho={26} /></span>
              <span className="account-card-text">
                <span className="account-card-title">Tutorial</span>
                <span className="account-card-sub">A Alice mostra tudo de novo</span>
              </span>
              <span className="account-card-chevron">&#8250;</span>
            </button>
            <Link className="account-card" to="/termos" style={{ borderColor: '#f5c9c6' }}>
              <span className="account-card-icon" style={{ color: '#f2726c' }}><Icone nome="mdi:file-document-outline" cor="f2726c" tamanho={26} /></span>
              <span className="account-card-text">
                <span className="account-card-title">Política de Privacidade</span>
                <span className="account-card-sub">Como cuidamos dos dados</span>
              </span>
              <span className="account-card-chevron">&#8250;</span>
            </Link>
            <button className="account-card" type="button" style={{ borderColor: '#cfd2ec' }} onClick={sair}>
              <span className="account-card-icon" style={{ color: '#9098cc' }}><Icone nome="mdi:logout" cor="9098cc" tamanho={26} /></span>
              <span className="account-card-text">
                <span className="account-card-title">Sair</span>
                <span className="account-card-sub">Encerrar sessão</span>
              </span>
              <span className="account-card-chevron">&#8250;</span>
            </button>
          </div>
        </div>
      )}

      <main className="home-corpo">
        <h2 className="home-pill" aria-label="Seus pequenos"><LetrasColoridas texto="Seus pequenos" /></h2>
        <div className="home-card">

        <div className="kids-list">
          {filhos.map((filho, i) => {
            const cor = filho.cor || CORES_CARD_HOME[i % CORES_CARD_HOME.length]; // cor escolhida em Configurações, se houver
            return (
              <div className="kid-card" key={filho.id} data-tutorial={i === 0 ? 'cartao' : undefined} style={{ background: cor, '--kid-borda': corDaBorda(cor) } as CSSProperties}>
                <div className="kid-top">
                  <div className="kid-avatar" style={filho.avatar ? { backgroundImage: `url('/sprite/avatar${filho.avatar}.jpg')` } : undefined} />
                  <div className="kid-info">
                    <span className="kid-name">{filho.nome}</span>
                    <span className="kid-age">{textoIdade(filho)}</span>
                  </div>
                  <button className="kid-chevron" type="button" aria-label="Abrir a área da criança" data-tutorial={i === 0 ? 'area-crianca' : undefined} onClick={() => abrirAreaDaCrianca(filho, cor)}>&#8250;</button>
                </div>
                <button className="kid-enter-btn" type="button" data-tutorial={i === 0 ? 'acessar-perfil' : undefined} onClick={() => entrar(filho, cor)}>
                  Acessar perfil
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <button className="add-kid-btn" type="button" data-tutorial="adicionar" onClick={() => navigate('/novo-pequeno')}>
          <span className="add-kid-plus" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16M4 12h16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
            </svg>
          </span>
          Adicionar criança
        </button>
        </div>
      </main>
    </>
  );
}
