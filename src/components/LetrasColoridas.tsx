import type { Ref } from 'react';

// As mesmas cores das letras de "Histórias" (tela de histórias), repetidas em ordem
export const CORES_LETRAS = ['#fe6e6d', '#f5ab2c', '#f9c846', '#5aa56a', '#5e6fb8', '#c47fb5', '#8fd3e4', '#5db39a', '#96ccaa'];

// Texto com uma cor em cada letra e contorno branco de adesivo, no estilo do título "Histórias".
// O contorno fica numa camada só, atrás das letras coloridas (assim uma letra não apaga a outra).
export default function LetrasColoridas({ texto, refTexto }: { texto: string; refTexto?: Ref<HTMLSpanElement> }) {
  let n = 0;
  return (
    <span className="letras-coloridas" ref={refTexto} aria-hidden="true">
      <span className="hist-pill-fundo">{texto}</span>
      <span className="hist-pill-letras">
        {[...texto].map((letra, i) => {
          if (letra.trim() === '') return <span key={i}>{letra}</span>;
          const cor = CORES_LETRAS[n++ % CORES_LETRAS.length];
          return <span key={i} style={{ color: cor }}>{letra}</span>;
        })}
      </span>
    </span>
  );
}
