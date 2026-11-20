interface Props {
  rotulo: string;
  aoClicar: () => void;
}

export default function GoogleBotao({ rotulo, aoClicar }: Props) {
  return (
    <button className="google-btn" aria-label={rotulo} type="button" onClick={aoClicar}>
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3C33.6 32.1 29.2 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.9 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.9 15.6 18.6 12 24 12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.9 6 29.2 4 24 4c-7.4 0-13.7 4.2-16.7 10.7z" />
        <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.2-5.2C29.1 35.6 26.7 36.5 24 36.5c-5.2 0-9.6-3.4-11.3-8.1l-6.2 4.8C9.7 39.7 16.3 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.9 2.6-2.6 4.7-4.9 6.2l6.2 5.2C40.4 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
      </svg>
    </button>
  );
}
