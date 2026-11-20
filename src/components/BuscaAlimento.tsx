import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Icone from './Icone';
import { useCatalogoAlimentos } from '../lib/useCatalogoAlimentos';
import type { AlimentoCatalogo } from '../types';

interface Props {
  id: string;
  valor: string;
  aoMudar: (valor: string) => void;
  aoEscolher: (alimento: AlimentoCatalogo) => void;
  aoApertarEnter?: () => void;
  placeholder?: string;
  estilo?: CSSProperties;
}

// Campo de busca de alimento com sugestões do catálogo
export default function BuscaAlimento({ id, valor, aoMudar, aoEscolher, aoApertarEnter, placeholder, estilo }: Props) {
  const catalogo = useCatalogoAlimentos();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // clicar fora fecha as sugestões
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, []);

  const termo = valor.trim().toLowerCase();
  const resultados = termo ? catalogo.filter((f) => f.nome.toLowerCase().includes(termo)).slice(0, 6) : [];

  return (
    <div className="search-wrap" style={estilo} ref={caixa}>
      <input
        className="search-input"
        id={id}
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && aoApertarEnter) {
            e.preventDefault();
            setAberto(false);
            aoApertarEnter();
          }
        }}
      />
      {aberto && resultados.length > 0 && (
        <div className="search-suggestions">
          {resultados.map((f) => (
            <button
              key={f.id}
              type="button"
              className="suggestion-item"
              onClick={() => {
                setAberto(false);
                aoEscolher(f);
              }}
            >
              <Icone nome={f.icone} cor="6fa981" tamanho={18} />
              <span>{f.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
