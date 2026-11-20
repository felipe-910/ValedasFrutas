import { Link } from 'react-router-dom';

interface Props {
  to?: string; // vai para essa rota...
  aoClicar?: () => void; // ...ou executa essa função (ex.: voltar no histórico)
}

const seta = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M12.5 4L6.5 10L12.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SetaVoltar({ to, aoClicar }: Props) {
  if (to) {
    return <Link className="back" to={to} aria-label="Voltar">{seta}</Link>;
  }
  return (
    <a
      className="back"
      href="#"
      aria-label="Voltar"
      onClick={(e) => {
        e.preventDefault();
        aoClicar?.();
      }}
    >
      {seta}
    </a>
  );
}
