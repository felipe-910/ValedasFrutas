import type { CSSProperties } from 'react';
import type { FilhoAtivo } from '../types';
import { textoIdade } from '../lib/idade';
import { calcularNivel } from '../lib/nivel';

interface Props {
  filho: FilhoAtivo;
  mostrarIdade?: boolean;
  mostrarNivel?: boolean;
  estilo?: CSSProperties;
}

// Cartão com avatar, nome (e idade / nível) do pequeno, usado no topo das telas da criança
export default function PerfilMini({ filho, mostrarIdade = false, mostrarNivel = false, estilo }: Props) {
  const nivel = calcularNivel(filho.xp);
  return (
    <div className="profile-mini" style={{ ...(filho.cor ? { background: filho.cor } : {}), ...estilo }}>
      <div className="kid-avatar" style={filho.avatar ? { backgroundImage: `url('/sprite/avatar${filho.avatar}.jpg')` } : undefined} />
      <div className="kid-info">
        <span className="kid-name">{filho.nome}</span>
        {mostrarIdade && <span className="kid-age">{textoIdade(filho)}</span>}
        {mostrarNivel && (
          <>
            <div className="level-row">
              <span className="level-label">Nível {nivel.nivel}</span>
              <span className="level-points">{nivel.xpNoNivel}/{nivel.xpPorNivel}pts</span>
            </div>
            <div className="level-bar-track"><div className="level-bar-fill" style={{ width: `${nivel.porcento}%` }} /></div>
          </>
        )}
      </div>
    </div>
  );
}
