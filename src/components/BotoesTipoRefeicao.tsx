import type { CSSProperties } from 'react';
import { CLASSE_TIPO } from '../lib/tiposRefeicao';
import { TIPOS_REFEICAO } from '../types';
import type { TipoRefeicao } from '../types';

interface Props {
  selecionados: TipoRefeicao[];
  aoEscolher: (tipo: TipoRefeicao) => void;
  estilo?: CSSProperties;
}

// As cinco caixas de refeição (café, lanche da manhã, almoço, lanche da tarde, janta).
// É o mesmo componente na tela de registrar refeição e na de adicionar meta.
export default function BotoesTipoRefeicao({ selecionados, aoEscolher, estilo }: Props) {
  return (
    <div className="meal-types" style={estilo}>
      {TIPOS_REFEICAO.map((tipo) => (
        <button
          key={tipo}
          className={`meal-type-btn ${CLASSE_TIPO[tipo]}${selecionados.includes(tipo) ? ' selected' : ''}`}
          type="button"
          onClick={() => aoEscolher(tipo)}
        >
          <span className="meal-ico" aria-hidden="true" />
          {tipo}
        </button>
      ))}
    </div>
  );
}
