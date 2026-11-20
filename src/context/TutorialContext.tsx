import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { guardarFilhoAtivo } from '../lib/sessao';
import { lerTutorialConta, salvarTutorialConta } from '../services/tutorial';
import type { TutorialConta } from '../services/tutorial';
import type { FilhoAtivo } from '../types';
// a Alice sem fundo (a mesma das histórias): mexe a boca enquanto o texto aparece
import aliceFalando from '../jogos/historia/assets/alice-falando.webp';
import aliceParada from '../jogos/historia/assets/alice-parado.webp';
import '../styles/tutorial.css';

/* ---------- Tutorial da área dos pais ----------
   Conta nova: no primeiro acesso a Alice mostra parte por parte do sistema (obrigatório, sem botão de pular):
   escurece a tela e deixa só a parte explicada acesa, com um balão de fala embaixo (ou em cima).
   Ele passa pela home, entra no perfil da primeira criança (para mostrar o painel, as refeições, as metas...)
   e volta para a home; depois, cada aba explica a si mesma na primeira vez que é aberta.
   Visto uma vez, não aparece mais (fica guardado na conta, em services/tutorial.ts): só se a pessoa pedir
   pelo Menu > Tutorial (ou Perfil > "Ver o tutorial novamente"), e aí dá para pular.
   Contas que já existiam antes do tutorial: ele só aparece se a pessoa pedir pelo menu. */

type Rota = '/home' | '/crianca';
interface Passo {
  rota?: Rota; // só no tutorial geral (que passa por mais de uma tela); nas telas, é a tela aberta
  alvo?: string; // seletor CSS da parte que fica acesa (sem alvo: balão no meio da tela)
  opcional?: boolean; // parte que pode não existir (ex.: lista vazia): se não estiver na tela, é pulada
  titulo: string;
  texto: string;
}

const INICIO: Passo = {
  rota: '/home',
  titulo: 'Oi! Eu sou a Alice!',
  texto: 'Vou te mostrar, parte por parte, como funciona a área dos pais. É rapidinho!',
};
const SININHO: Passo = {
  rota: '/home',
  alvo: '[data-tutorial="sininho"]',
  titulo: 'Notificações',
  texto: 'No sininho chegam os avisos: meta criada, mais um dia cumprido, meta atingida e prazo acabando. A bolinha vermelha mostra quantos avisos novos você tem.',
};
const MENU: Passo = {
  rota: '/home',
  alvo: '[data-tutorial="menu"]',
  titulo: 'Menu',
  texto: 'No menu ficam o seu perfil (para trocar foto, nome e a senha da área dos pais), o Tutorial, os Termos de Uso e o botão de sair.',
};
const FIM: Passo = {
  rota: '/home',
  titulo: 'Pronto!',
  texto: 'Agora você já sabe onde fica cada coisa. Na primeira vez que você abrir cada parte, eu apareço para explicar como ela funciona. Depois, se quiser me ver de novo, é só abrir o Menu e tocar em Tutorial.',
};

const PASSOS_COM_CRIANCA: Passo[] = [
  INICIO,
  {
    rota: '/home',
    alvo: '[data-tutorial="cartao"]',
    titulo: 'Seus pequenos',
    texto: 'Cada cartão é uma criança que você cadastrou, com o nome e a idade dela.',
  },
  {
    rota: '/home',
    alvo: '[data-tutorial="area-crianca"]',
    titulo: 'Área da criança',
    texto: 'Esta setinha abre a área da criança. Lá ela escolhe a Alice ou o Luca, ouve as histórias e joga os minijogos. Para sair de lá e voltar para cá, é preciso digitar a senha dos pais.',
  },
  {
    rota: '/home',
    alvo: '[data-tutorial="acessar-perfil"]',
    titulo: 'Acessar perfil',
    texto: 'Já este botão é só para você: abre o acompanhamento da criança. Vamos entrar para eu te mostrar o que tem lá dentro?',
  },
  {
    rota: '/crianca',
    alvo: '.child-body .profile-mini',
    titulo: 'Perfil da criança',
    texto: 'Aqui aparecem o nome, a idade e o nível dela. A criança ganha pontos jogando os minijogos e cumprindo as metas, e assim sobe de nível.',
  },
  {
    rota: '/crianca',
    alvo: '[data-tutorial="painel"]',
    titulo: 'Painel de acompanhamento',
    texto: 'Um resumo com gráficos de tudo: como ela tem comido nas refeições, como foi nos minijogos e como estão as metas.',
  },
  {
    rota: '/crianca',
    alvo: '[data-tutorial="desempenho"]',
    titulo: 'Desempenho',
    texto: 'O resultado de cada partida dos minijogos (Cesta Saudável, Semáforo Saudável e Monte seu Prato), com o que ela acertou e o que errou.',
  },
  {
    rota: '/crianca',
    alvo: '[data-tutorial="lista-refeicoes"]',
    titulo: 'Registrar refeições',
    texto: 'Aqui você anota o que a criança comeu em cada refeição do dia (café da manhã, almoço, lanche, jantar) e se ela comeu tudo, pela metade ou não comeu.',
  },
  {
    rota: '/crianca',
    alvo: '[data-tutorial="metas"]',
    titulo: 'Metas',
    texto: 'Crie metas para a criança, como comer uma fruta no lanche, e escolha uma recompensa. As metas de refeição e de alimento avançam sozinhas com as refeições que você registra.',
  },
  {
    rota: '/crianca',
    alvo: '[data-tutorial="configuracoes"]',
    titulo: 'Configurações',
    texto: 'Para mudar o nome, a data de nascimento, o personagem e a cor do cartão da criança, ou excluir o cadastro dela.',
  },
  SININHO,
  MENU,
  {
    rota: '/home',
    alvo: '[data-tutorial="adicionar"]',
    titulo: 'Adicionar criança',
    texto: 'Tem mais de um pequeno em casa? Toque aqui para cadastrar outra criança.',
  },
  FIM,
];

const PASSOS_SEM_CRIANCA: Passo[] = [
  INICIO,
  {
    rota: '/home',
    alvo: '[data-tutorial="adicionar"]',
    titulo: 'Adicionar criança',
    texto: 'Comece por aqui: cadastre a sua criança. Depois, cada pequeno ganha um cartão nesta tela, com o acompanhamento dele.',
  },
  SININHO,
  MENU,
  FIM,
];

/* ---------- Tutorial de cada aba da criança ----------
   Na primeira vez que o responsável abre a tela, a Alice explica as partes dela. */
export type IdTela = 'painel' | 'desempenho' | 'lista-refeicoes' | 'refeicoes' | 'metas' | 'adicionar-meta' | 'configuracoes';
type IdTutorial = 'geral' | IdTela;

const TUTORIAIS_TELAS: Record<IdTela, Passo[]> = {
  painel: [
    {
      alvo: '.pn-abas',
      titulo: 'Painel de acompanhamento',
      texto: 'Aqui você escolhe o que quer ver: Refeições (como a criança está comendo), Minijogos (como ela foi nos jogos e quais alimentos mais erra) e Metas (como estão as metas).',
    },
    {
      alvo: '.pn-periodo',
      opcional: true,
      titulo: 'Período',
      texto: 'Escolha se quer ver os últimos 7 ou 30 dias. Os números e os gráficos mudam na hora.',
    },
    {
      alvo: '.pn-pagina [role="tabpanel"] > :first-child',
      opcional: true,
      titulo: 'Números e gráficos',
      texto: 'Aqui aparece o resumo do painel escolhido: quantas vezes ela comeu tudo, pela metade ou não comeu, em cada refeição, e quais alimentos mais aceita ou recusa. Role a tela para ver todos os gráficos.',
    },
  ],
  desempenho: [
    {
      alvo: '.perf-pagina .perf-abas',
      titulo: 'Desempenho nos minijogos',
      texto: 'Veja as partidas de todos os minijogos ou só de um: Cesta, Semáforo ou Prato.',
    },
    {
      alvo: '.perf-pagina .meal-filter-btn',
      titulo: 'Filtrar por data',
      texto: 'Toque no filtro para ver só as partidas desta semana, da semana passada ou de um dia que você escolher.',
    },
    {
      alvo: '.perf-pagina .sort-row',
      titulo: 'Ordem da lista',
      texto: 'Mude a ordem das partidas: mais recentes, mais antigas ou pelo nome do jogo.',
    },
    {
      alvo: '.perf-lista .perf-card',
      opcional: true,
      titulo: 'Cada partida',
      texto: 'Cada cartão é uma partida: o jogo, as estrelas que ela ganhou (até 3), quando jogou, com qual personagem, o que acertou e errou e quantos pontos (XP) ganhou.',
    },
  ],
  'lista-refeicoes': [
    {
      alvo: '.child-body > .meal-filter-tabs',
      titulo: 'Refeições anotadas',
      texto: 'Aqui ficam todas as refeições que você anotou. Use estas abas para ver todas ou só um tipo: café da manhã, almoço, lanches ou janta.',
    },
    {
      alvo: '.child-body > .meal-filter-bar .meal-filter-btn',
      titulo: 'Filtrar por data',
      texto: 'Toque no filtro para ver só as refeições desta semana, da semana passada ou de um dia que você escolher.',
    },
    {
      alvo: '.meal-card',
      opcional: true,
      titulo: 'Cada refeição',
      texto: 'O cartão mostra qual foi a refeição, os alimentos, como ela comeu e o dia e a hora. Toque no lápis para corrigir ou na lixeira para apagar.',
    },
    {
      alvo: '.child-body > .cta',
      titulo: 'Registrar refeição',
      texto: 'Toque aqui para anotar uma refeição nova. Quanto mais você anota, mais completo fica o painel.',
    },
  ],
  refeicoes: [
    {
      alvo: '.child-body > .meal-types',
      titulo: '1. Qual refeição?',
      texto: 'Primeiro escolha qual refeição você vai anotar: café da manhã, lanche da manhã, almoço, lanche da tarde ou janta.',
    },
    {
      alvo: '.child-body > .search-wrap',
      titulo: '2. O que ela comeu?',
      texto: 'Digite o nome do alimento e toque nele nas sugestões. Se não aparecer, termine de digitar e aperte Enter. Faça isso para cada alimento do prato.',
    },
    {
      alvo: '.child-body > .food-list-label',
      titulo: 'Alimentos adicionados',
      texto: 'Os alimentos escolhidos aparecem logo abaixo daqui. Use o lápis para corrigir o nome ou a lixeira para tirar da lista.',
    },
    {
      alvo: '.child-body > .meal-status-options',
      titulo: '3. Como ela comeu?',
      texto: 'Marque "Completa" se ela comeu tudo, "Pela metade" ou "Não comeu". Isso aparece no painel e faz as metas avançarem.',
    },
    {
      alvo: '.child-body > .cta',
      titulo: '4. Salvar',
      texto: 'Por fim, toque em "Salvar refeições". A refeição vai para a lista e as metas são atualizadas sozinhas.',
    },
  ],
  metas: [
    {
      alvo: '.child-body > .goal-tabs',
      titulo: 'Metas da criança',
      texto: 'Em "Atuais" ficam as metas em andamento e em "Concluídas", as que ela já cumpriu.',
    },
    {
      alvo: '.goal-card',
      opcional: true,
      titulo: 'Cada meta',
      texto: 'O cartão mostra o nome da meta, a recompensa e quanto já avançou. As metas de refeição e de alimento avançam e terminam sozinhas, com as refeições que você anota. As simples você marca como concluída aqui.',
    },
    {
      alvo: '.goal-card .goal-actions',
      opcional: true,
      titulo: 'Editar ou excluir',
      texto: 'Toque em Editar para mudar a meta ou em Excluir para apagá-la.',
    },
    {
      alvo: '.child-body > .cta',
      titulo: 'Nova meta',
      texto: 'Toque aqui para criar uma meta nova. Lá dentro eu te mostro como funciona!',
    },
  ],
  'adicionar-meta': [
    {
      alvo: '.child-body > .step-indicator',
      titulo: 'Criar uma meta',
      texto: 'São só 2 passos: primeiro você monta a meta e depois escolhe a recompensa.',
    },
    {
      alvo: '.goal-type-options',
      titulo: 'Tipo de meta',
      texto: 'Simples: uma tarefa que você marca como concluída. De refeição: conta os dias em que ela completa as refeições escolhidas. De alimento: conta os dias em que ela come um alimento (como brócolis) numa refeição completa.',
    },
    {
      alvo: '#tituloMeta',
      titulo: 'Nome da meta',
      texto: 'Escreva qual é a meta, por exemplo "Comer fruta no lanche". Logo abaixo, se quiser, coloque uma descrição.',
    },
    {
      alvo: '.child-body .color-grid',
      titulo: 'Cor',
      texto: 'Escolha uma cor para achar a meta fácil na lista.',
    },
    {
      alvo: '.child-body section > .cta',
      titulo: 'Recompensa',
      texto: 'Depois toque em Próximo para escolher a recompensa, como um passeio ou um filme em família. Ela aparece no cartão da meta para motivar a criança.',
    },
  ],
  configuracoes: [
    {
      alvo: '.child-body > .settings-card',
      titulo: 'Cor da criança',
      texto: 'Escolha a cor da criança: ela aparece no cartão da tela inicial e no perfil dela.',
    },
    {
      alvo: '.settings-list .settings-btn:not(.danger)',
      titulo: 'Editar informações',
      texto: 'Mude o nome, a data de nascimento ou o personagem que aparece na foto da criança.',
    },
    {
      alvo: '.settings-list .settings-btn.danger',
      titulo: 'Excluir',
      texto: 'Apaga o cadastro desta criança. Cuidado: isso não pode ser desfeito.',
    },
  ],
};
const TODOS: IdTutorial[] = ['geral', ...(Object.keys(TUTORIAIS_TELAS) as IdTela[])];

interface TutorialCtx {
  ativo: boolean;
  contaPronta: boolean; // já leu da conta o que a pessoa viu
  podeMostrar: (id: IdTutorial) => boolean; // aparece sozinho? (conta nova ou pediu pelo menu, e ainda não viu)
  // filho: a criança usada para mostrar o perfil por dentro (null: ainda não tem nenhuma)
  iniciar: (filho: FilhoAtivo | null) => void;
  iniciarTela: (id: IdTela) => void;
  // Menu > Tutorial: o geral e o de cada tela voltam a aparecer (e dá para pular)
  reverTudo: () => void;
}
const Contexto = createContext<TutorialCtx>({
  ativo: false, contaPronta: false, podeMostrar: () => false, iniciar: () => {}, iniciarTela: () => {}, reverTudo: () => {},
});
export const useTutorial = () => useContext(Contexto);

// Nas telas: mostra o tutorial delas na primeira vez (pronto = a tela já carregou o que mostra)
export function useTutorialDaTela(id: IdTela, pronto = true): void {
  const { ativo, contaPronta, podeMostrar, iniciarTela } = useContext(Contexto);
  useEffect(() => {
    if (!pronto || !contaPronta || ativo || !podeMostrar(id)) return undefined;
    const t = window.setTimeout(() => iniciarTela(id), 450); // deixa a tela terminar de aparecer
    return () => window.clearTimeout(t);
  }, [pronto, contaPronta, ativo, id, podeMostrar, iniciarTela]);
}

interface Estado {
  id: IdTutorial;
  passos: Passo[];
  i: number;
  filho: FilhoAtivo | null;
  tela: string; // onde começou (o tutorial de uma tela some se sair dela)
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [conta, setConta] = useState<TutorialConta | null>(null);

  // o que esta conta já viu (fica na conta: vale em qualquer aparelho)
  useEffect(() => {
    setConta(null);
    if (!user) return undefined;
    let vivo = true;
    lerTutorialConta(user.uid).then((t) => { if (vivo) setConta(t); });
    return () => { vivo = false; };
  }, [user]);

  const podeMostrar = useCallback((id: IdTutorial) => !!conta && conta.mostrar && !conta.vistos[id], [conta]);

  const iniciar = useCallback((filho: FilhoAtivo | null) => {
    setEstado({ id: 'geral', passos: filho ? PASSOS_COM_CRIANCA : PASSOS_SEM_CRIANCA, i: 0, filho, tela: '/home' });
  }, []);

  const iniciarTela = useCallback(
    (id: IdTela) => {
      // partes opcionais que não estão na tela (ex.: lista ainda vazia) ficam de fora
      const passos = TUTORIAIS_TELAS[id].filter((p) => !p.opcional || (p.alvo && document.querySelector(p.alvo)));
      if (passos.length) setEstado({ id, passos, i: 0, filho: null, tela: pathname });
    },
    [pathname]
  );

  const reverTudo = useCallback(() => {
    if (!user) return;
    const nova: TutorialConta = { mostrar: true, obrigatorio: false, vistos: {} };
    setConta(nova);
    void salvarTutorialConta(user.uid, nova);
  }, [user]);

  // muda de parte; se ela fica em outra tela, vai para lá (o perfil por dentro usa a primeira criança)
  const irPara = useCallback(
    (i: number) => {
      const passo = estado?.passos[i];
      if (!estado || !passo) return;
      if (passo.rota && passo.rota !== pathname) {
        if (passo.rota === '/crianca' && estado.filho) guardarFilhoAtivo(estado.filho);
        navigate(passo.rota);
      }
      setEstado({ ...estado, i, tela: passo.rota ?? estado.tela });
    },
    [estado, navigate, pathname]
  );

  const fechar = useCallback(() => {
    if (user && estado) {
      const vistos = { ...(conta?.vistos ?? {}), [estado.id]: true };
      // viu todos: daqui para frente nada aparece sozinho
      const nova: TutorialConta = { mostrar: TODOS.some((id) => !vistos[id]), obrigatorio: conta?.obrigatorio ?? false, vistos };
      setConta(nova);
      void salvarTutorialConta(user.uid, nova);
    }
    setEstado(null);
  }, [user, estado, conta]);

  // saiu da conta no meio: some o tutorial
  useEffect(() => {
    if (!user) setEstado(null);
  }, [user]);

  // saiu da tela no meio do tutorial dela (ex.: botão voltar do celular): ele some e aparece na próxima visita
  useEffect(() => {
    if (estado && estado.id !== 'geral' && pathname !== estado.tela) setEstado(null);
  }, [pathname, estado]);

  const valor = useMemo(
    () => ({ ativo: !!estado, contaPronta: conta !== null, podeMostrar, iniciar, iniciarTela, reverTudo }),
    [estado, conta, podeMostrar, iniciar, iniciarTela, reverTudo]
  );
  const passo = estado ? estado.passos[estado.i] : null;

  return (
    <Contexto.Provider value={valor}>
      {children}
      {estado && passo &&
        createPortal(
          <Balao
            key={`${estado.id}-${estado.i}`}
            passo={passo}
            indice={estado.i}
            total={estado.passos.length}
            geral={estado.id === 'geral'}
            podePular={!conta?.obrigatorio}
            noLugarCerto={!passo.rota || passo.rota === pathname}
            onProximo={() => (estado.i + 1 >= estado.passos.length ? fechar() : irPara(estado.i + 1))}
            onVoltar={() => irPara(estado.i - 1)}
            onPular={fechar}
          />,
          document.body
        )}
    </Contexto.Provider>
  );
}

const reduzMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FOLGA = 8; // espaço entre a parte acesa e a borda do destaque
// onde estava o destaque na parte anterior: ele desliza de lá até a próxima parte (em vez de nascer do meio)
let ultimoAlvo: DOMRect | null = null;

interface BalaoProps {
  passo: Passo;
  indice: number;
  total: number;
  geral: boolean; // o tutorial geral (o das telas começa direto na primeira parte e termina com "Entendi!")
  podePular: boolean; // no primeiro acesso da conta é obrigatório
  noLugarCerto: boolean;
  onProximo: () => void;
  onVoltar: () => void;
  onPular: () => void;
}

function Balao({ passo, indice, total, geral, podePular, noLugarCerto, onProximo, onVoltar, onPular }: BalaoProps) {
  const [alvo, setAlvo] = useState<DOMRect | null>(() => (passo.alvo && indice > 0 ? ultimoAlvo : null));
  const [n, setN] = useState(() => (reduzMovimento() ? passo.texto.length : 0));
  const proximoRef = useRef<HTMLButtonElement>(null);
  const ultimo = indice === total - 1;

  useEffect(() => {
    ultimoAlvo = alvo;
  }, [alvo]);

  // acha a parte explicada (a tela pode ainda estar carregando), rola até ela e acompanha a posição
  useEffect(() => {
    if (!passo.alvo || !noLugarCerto) {
      setAlvo(null);
      return undefined;
    }
    let rolou = false;
    const medir = () => {
      const el = document.querySelector<HTMLElement>(passo.alvo as string);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (!rolou) {
        rolou = true;
        el.scrollIntoView({ block: 'center', behavior: reduzMovimento() ? 'auto' : 'smooth' });
      }
      setAlvo((a) =>
        a && Math.abs(a.top - r.top) < 1 && Math.abs(a.left - r.left) < 1 && Math.abs(a.width - r.width) < 1 && Math.abs(a.height - r.height) < 1 ? a : r
      );
    };
    medir();
    const id = window.setInterval(medir, 120);
    return () => window.clearInterval(id);
  }, [passo.alvo, noLugarCerto]);

  // o texto vai aparecendo (a Alice "fala" enquanto isso)
  useEffect(() => {
    if (n >= passo.texto.length) return undefined;
    const id = window.setTimeout(() => setN((c) => c + 2), 24);
    return () => window.clearTimeout(id);
  }, [n, passo.texto.length]);
  const falando = n < passo.texto.length;

  useEffect(() => {
    proximoRef.current?.focus({ preventScroll: true });
  }, []);

  // setas do teclado também passam
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onProximo();
      else if (e.key === 'ArrowLeft' && indice > 0) onVoltar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [indice, onProximo, onVoltar]);

  // o balão fica do lado da tela com mais espaço livre (sem parte acesa: no meio)
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const lado = !alvo ? 'meio' : alvo.top > vh - alvo.bottom ? 'cima' : 'baixo';
  const destaque: CSSProperties = alvo
    ? { top: alvo.top - FOLGA, left: alvo.left - FOLGA, width: alvo.width + 2 * FOLGA, height: alvo.height + 2 * FOLGA }
    : { top: '50%', left: '50%', width: 0, height: 0 };

  return (
    <div className="tt-raiz" role="dialog" aria-modal="true" aria-labelledby="tt-titulo" aria-describedby="tt-texto">
      <div className={`tt-destaque${alvo ? ' tt-destaque--aceso' : ''}`} style={destaque} aria-hidden="true" />
      <div className={`tt-balao tt-balao--${lado}`}>
        <div className="tt-alice" aria-hidden="true">
          <img src={falando ? aliceFalando : aliceParada} alt="" draggable={false} />
        </div>
        <div className="tt-caixa" onClick={() => setN(passo.texto.length)}>
          <div className="tt-topo">
            <span className="tt-nome">Alice</span>
            {!ultimo && podePular && (
              <button className="tt-pular" type="button" onClick={onPular}>
                Pular tutorial
              </button>
            )}
          </div>
          <h2 id="tt-titulo" className="tt-titulo">{passo.titulo}</h2>
          <p id="tt-texto" className="tt-texto">
            <span className="tt-sr">{passo.texto}</span>
            <span aria-hidden="true">
              {passo.texto.slice(0, n)}
              <span className="tt-resto">{passo.texto.slice(n)}</span>
            </span>
          </p>
          <div className="tt-rodape">
            <span className="tt-progresso">
              <span className="tt-barra" aria-hidden="true"><i style={{ width: `${((indice + 1) / total) * 100}%` }} /></span>
              <small>{indice + 1} de {total}</small>
            </span>
            <span className="tt-botoes">
              {indice > 0 && !ultimo && (
                <button className="tt-voltar" type="button" onClick={(e) => { e.stopPropagation(); onVoltar(); }}>
                  Voltar
                </button>
              )}
              <button ref={proximoRef} className="tt-proximo" type="button" onClick={(e) => { e.stopPropagation(); onProximo(); }}>
                {ultimo ? (geral ? 'Começar a usar' : 'Entendi!') : indice === 0 && geral ? 'Vamos lá!' : 'Próximo'}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
