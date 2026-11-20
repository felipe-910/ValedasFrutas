import type { HTMLInputTypeAttribute } from 'react';

interface Props {
  id: string;
  label: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: HTMLInputTypeAttribute;
  placeholder?: string;
  mensagemErro?: string;
  comErro?: boolean;
  autoComplete?: string;
  desabilitado?: boolean;
}

// Campo de formulário com rótulo e mensagem de erro (classe .field do style.css)
export default function Campo({ id, label, valor, aoMudar, tipo = 'text', placeholder, mensagemErro, comErro, autoComplete, desabilitado }: Props) {
  return (
    <div className={`field${comErro ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete={autoComplete}
        disabled={desabilitado}
      />
      {mensagemErro && <span className="error">{mensagemErro}</span>}
    </div>
  );
}
