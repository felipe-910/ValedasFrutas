import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Campo from '../components/Campo';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { emailValido, useFormulario } from '../lib/useFormulario';
import { usePagina } from '../lib/usePagina';
import { resetPassword, traduzErro } from '../services/auth';
import { codigoDoErro } from '../services/erros';

export default function RecuperarSenha() {
  usePagina('Recuperar senha', 'page-white', '#ffffff');
  const mostrarToast = useToast();
  const [params] = useSearchParams();
  const [enviando, setEnviando] = useState(false);
  const [mostrarNota, setMostrarNota] = useState(false);

  // Pré-preenche o email se veio da tela de login
  const { valores, alterar, erro, validarTudo } = useFormulario(
    { email: params.get('email') || '' },
    (v) => ({ email: !emailValido(v.email) })
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!validarTudo()) return;
    setEnviando(true);
    try {
      await resetPassword(valores.email.trim());
      mostrarToast('Se esse email tiver uma conta, o link de recuperação foi enviado!');
      setMostrarNota(true);
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="wrap">
      <SetaVoltar to="/login" />
      <img className="logo small" src="/logo.png" alt="Vale das Frutas" />

      <h1 className="sticker-heading" style={{ textAlign: 'center' }}><span className="sticker-line on-green">Recuperar senha</span></h1>
      <p className="recovery-hint">Enviaremos um link de redefinição de senha para o seu e-mail cadastrado.</p>

      <form onSubmit={enviar} noValidate>
        <Campo id="emailRecuperacao" label="Email" tipo="email" placeholder="Digite seu email" valor={valores.email}
          aoMudar={(v) => alterar('email', v)} comErro={erro('email')} mensagemErro="Digite um email válido." />
        <button className="cta" type="submit" disabled={enviando}>Enviar link de recuperação</button>
      </form>

      <p className="switch-line">Lembrou a senha? <Link to="/login">Voltar ao login</Link></p>

      {mostrarNota && (
        <div className="recovery-note">
          Se o email não chegar em alguns minutos: <b>verifique a caixa de spam/lixo eletrônico</b>,
          confirme que digitou o email certo e lembre que <b>contas criadas com "Entrar com Google" não têm senha</b>
          para redefinir — nesse caso, use sempre o botão do Google para entrar.
        </div>
      )}
    </div>
  );
}
