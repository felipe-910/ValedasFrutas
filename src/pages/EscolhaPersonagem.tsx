import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { lerCadastroPendente, limparCadastroPendente } from '../lib/sessao';
import { usePagina } from '../lib/usePagina';
import { addFilho } from '../services/filhos';

const AVATARES = ['1', '2'];

export default function EscolhaPersonagem() {
  usePagina('Escolha o personagem');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  // Recupera nome/data de nascimento da tela anterior; se não existir, volta pro passo 1
  const [pendente] = useState(() => lerCadastroPendente());
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!pendente) return <Navigate to="/novo-pequeno" replace />;
  if (!pendente.dataNascimento) {
    limparCadastroPendente();
    return <Navigate to="/novo-pequeno" replace />;
  }

  async function continuar() {
    if (!pendente) return;
    if (!selecionado) {
      mostrarToast('Escolha um personagem para continuar.');
      return;
    }
    setEnviando(true);
    try {
      await addFilho({ nome: pendente.nome, dataNascimento: pendente.dataNascimento, avatar: selecionado });
      limparCadastroPendente();
      mostrarToast('Pequeno cadastrado com sucesso!');
      setTimeout(() => navigate('/home'), 800);
    } catch (err) {
      mostrarToast('Não foi possível salvar. Tente novamente.');
      console.error(err);
      setEnviando(false);
    }
  }

  return (
    <div className="wrap">
      <SetaVoltar to="/novo-pequeno" />

      <h1 className="sticker-heading">
        <span className="sticker-line on-green">Escolha o personagem</span>
      </h1>

      <div className="avatar-grid">
        {AVATARES.map((n) => (
          <button
            key={n}
            className={`avatar-option${selecionado === n ? ' selected' : ''}`}
            type="button"
            aria-label={`Personagem ${n}`}
            style={{ backgroundImage: `url('/sprite/avatar${n}.jpg')` }}
            onClick={() => setSelecionado(n)}
          />
        ))}
      </div>

      <button className="cta" type="button" disabled={enviando} onClick={continuar}>Continuar</button>
    </div>
  );
}
