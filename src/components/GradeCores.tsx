import type { CSSProperties } from 'react';
import type { CorOpcao } from '../lib/cores';

interface Props {
  cores: CorOpcao[];
  selecionada?: string;
  aoEscolher: (hex: string) => void;
  estilo?: CSSProperties;
}

export default function GradeCores({ cores, selecionada, aoEscolher, estilo }: Props) {
  return (
    <div className="color-grid" style={estilo}>
      {cores.map((c) => (
        <button
          key={c.hex}
          className={`color-swatch${selecionada === c.hex ? ' selected' : ''}`}
          style={c.hex === '#ffffff' ? { background: c.hex, border: '1.5px solid var(--border)' } : { background: c.hex }}
          type="button"
          aria-label={c.nome}
          onClick={() => aoEscolher(c.hex)}
        />
      ))}
    </div>
  );
}
