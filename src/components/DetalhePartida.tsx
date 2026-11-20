import imgPrato from '../jogos/prato/assets/prato.png';
import { POSICOES, SECOES, TAM_ITEM } from '../jogos/prato/geometria';
import type { CorSemaforo, DetalhesCesta, DetalhesPartida, DetalhesPrato, DetalhesSemaforo, IdNarrador, ItemCesta } from '../types';

// As imagens dos alimentos são as dos próprios minigames. Guardamos só o id (nome do arquivo) na partida.
const IMAGENS = import.meta.glob('../jogos/{cesta,prato}/assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const imagem = (id: string, pasta: 'cesta' | 'prato' = 'cesta') =>
  IMAGENS[`../jogos/${pasta}/assets/${id}.png`] ?? IMAGENS[`../jogos/${pasta === 'cesta' ? 'prato' : 'cesta'}/assets/${id}.png`];

const NARRADORES: Record<IdNarrador, { nome: string; img: string }> = {
  luca: { nome: 'Luca', img: '/sprite/avatar1.jpg' },
  alice: { nome: 'Alice', img: '/sprite/avatar2.jpg' }
};

const NOME_COR: Record<CorSemaforo, string> = { verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho' };

export function NarradorPartida({ narrador }: { narrador?: IdNarrador | null }) {
  const n = narrador ? NARRADORES[narrador] : null;
  if (!n) return null;
  return (
    <div className="perf-linha">
      <img className="perf-narrador" src={n.img} alt="" />
      <span className="perf-narrador-nome">Personagem: {n.nome}</span>
    </div>
  );
}

function ListaCesta({ titulo, classe, itens }: { titulo: string; classe: string; itens: ItemCesta[] }) {
  return (
    <>
      <div className={`perf-secao ${classe}`}>{titulo} ({itens.reduce((s, i) => s + i.qtd, 0)})</div>
      {itens.length === 0 && <div className="perf-nada">Nenhum</div>}
      <div className="perf-itens">
        {itens.map((i) => (
          <span className="perf-item" key={i.id}>
            <img src={imagem(i.id)} alt="" />{i.nome}{i.qtd > 1 ? ` ×${i.qtd}` : ''}
          </span>
        ))}
      </div>
    </>
  );
}

function Cesta({ d }: { d: DetalhesCesta }) {
  return (
    <div>
      <ListaCesta titulo="Certos" classe="certo" itens={d.certos} />
      <ListaCesta titulo="Errados" classe="errado" itens={d.errados} />
    </div>
  );
}

function Prato({ d }: { d: DetalhesPrato }) {
  const nomes = d.divisoes.flatMap((v) => v.alimentos.map((a) => a.nome));
  return (
    <div>
      <div className="perf-prato" role="img" aria-label={`Prato montado: ${nomes.join(', ') || 'vazio'}`}>
        <img src={imgPrato} alt="" />
        {d.divisoes.map((v) => {
          const [x0, y0, x1, y1] = SECOES[v.secao];
          const pos = POSICOES[Math.max(1, Math.min(2, v.alimentos.length))];
          return (
            <div key={v.secao} className="perf-prato-zona" style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` }}>
              {v.alimentos.slice(0, 2).map((a, k) => (
                <img key={a.id} src={imagem(a.id, 'prato')} alt="" style={{ left: `${pos[k][0] * 100}%`, top: `${pos[k][1] * 100}%`, width: `${TAM_ITEM[v.secao] * 100}%` }} />
              ))}
            </div>
          );
        })}
      </div>
      <div className="perf-prato-nomes">{nomes.join(', ') || 'Prato vazio'}</div>
    </div>
  );
}

function Semaforo({ d }: { d: DetalhesSemaforo }) {
  return (
    <ul className="perf-respostas">
      {d.respostas.map((r) => {
        const acertou = r.escolha === r.certa;
        return (
          <li className="perf-resposta" key={r.id}>
            <img src={imagem(r.id)} alt="" />
            <span className="perf-resposta-nome">{r.nome}</span>
            <span className="perf-cor"><i className={r.escolha} />{NOME_COR[r.escolha]}</span>
            <span className={`perf-marca ${acertou ? 'certo' : 'errado'}`} role="img" aria-label={acertou ? 'Acertou' : `Errou: o certo era ${NOME_COR[r.certa]}`}>{acertou ? '✓' : '✗'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function DetalhePartida({ detalhes }: { detalhes?: DetalhesPartida | null }) {
  if (!detalhes) return null; // partidas jogadas antes desta versão
  if (detalhes.tipo === 'cesta') return <Cesta d={detalhes} />;
  if (detalhes.tipo === 'prato') return <Prato d={detalhes} />;
  return <Semaforo d={detalhes} />;
}
