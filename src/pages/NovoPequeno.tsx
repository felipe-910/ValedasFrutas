import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { calcularIdade, formatarIdade, paraISO } from '../lib/idade';
import { guardarCadastroPendente, lerCadastroPendente, limparCadastroPendente } from '../lib/sessao';
import { usePagina } from '../lib/usePagina';

// Valida a data e devolve a mensagem de erro (ou '' se estiver tudo certo).
// Não há idade máxima: o pai cadastra a criança da idade que quiser.
function validarData(valor: string): string {
  if (!valor) return 'Informe a data de nascimento.';
  if (!calcularIdade(valor)) return 'A data de nascimento não pode estar no futuro.';
  return '';
}

// Se o pai voltou da escolha do personagem, devolve o que ele já tinha preenchido
function lerPendenteSeguro() {
  try {
    return lerCadastroPendente();
  } catch {
    limparCadastroPendente();
    return null;
  }
}

export default function NovoPequeno() {
  usePagina('Vamos conhecer seu pequeno!');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const salvo = lerPendenteSeguro();
  const [nome, setNome] = useState(salvo?.nome || '');
  const [dataNascimento, setDataNascimento] = useState(salvo?.dataNascimento || '');

  // Mostra a idade calculada assim que o pai escolhe a data
  const erroData = dataNascimento ? validarData(dataNascimento) : '';
  const textoIdade = erroData || (dataNascimento ? `Idade: ${formatarIdade(calcularIdade(dataNascimento))}` : '');

  function continuar(e: FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) {
      mostrarToast('Digite o nome da criança.');
      return;
    }
    const erro = validarData(dataNascimento);
    if (erro) {
      mostrarToast(erro);
      return;
    }
    // Guarda os dados temporariamente até o pai escolher o personagem
    guardarCadastroPendente({ nome: nomeLimpo, dataNascimento });
    navigate('/escolha-personagem');
  }

  return (
    <div className="wrap">
      <SetaVoltar aoClicar={() => navigate(-1)} />

      <h1 className="sticker-heading heading-tight">
        <span className="sticker-line on-green">Vamos conhecer seu</span>
        <span className="sticker-line on-green">pequeno!</span>
      </h1>

      <form onSubmit={continuar} noValidate>
        <div className="notched-field">
          <span className="notch-label">Nome da criança</span>
          <input id="nomeCrianca" name="nomeCrianca" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div className="notched-field">
          <span className="notch-label">Data de nascimento</span>
          <input id="dataNascimento" name="dataNascimento" type="date" max={paraISO(new Date())} value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </div>
        <p className={`idade-calculada${erroData ? ' erro' : ''}`} aria-live="polite">{textoIdade}</p>

        <button className="cta" type="submit">Continuar</button>
      </form>
    </div>
  );
}
