import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Campo from '../components/Campo';
import GoogleBotao from '../components/GoogleBotao';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { emailValido, useFormulario } from '../lib/useFormulario';
import { usePagina } from '../lib/usePagina';
import { loginUser, loginWithGoogle, traduzErro } from '../services/auth';
import { codigoDoErro } from '../services/erros';
import { destinoAposLogin } from '../services/filhos';
import { registrarLogin } from '../services/notificacoes';

export default function Login() {
  usePagina('Entrar', 'page-white', '#ffffff');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [enviando, setEnviando] = useState(false);

  const { valores, alterar, erro, validarTudo } = useFormulario(
    { email: '', senha: '' },
    (v) => ({ email: !emailValido(v.email), senha: v.senha.length < 6 })
  );

  function irParaAreaLogada() {
    setTimeout(async () => navigate(await destinoAposLogin(), { replace: true }), 800);
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!validarTudo()) return;
    setEnviando(true);
    try {
      await loginUser(valores.email.trim(), valores.senha);
      void registrarLogin();
      mostrarToast('Login realizado com sucesso!');
      irParaAreaLogada();
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    try {
      await loginWithGoogle();
      void registrarLogin();
      mostrarToast('Login com Google realizado!');
      irParaAreaLogada();
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    }
  }

  function esqueciSenha(e: MouseEvent) {
    e.preventDefault();
    const email = valores.email.trim();
    navigate('/recuperar-senha' + (email ? `?email=${encodeURIComponent(email)}` : ''));
  }

  return (
    <div className="wrap">
      <SetaVoltar to="/" />
      <img className="logo small" src="/logo.png" alt="Vale das Frutas" />

      <div className="tabs">
        <Link className="tab active" to="/login">Login</Link>
        <Link className="tab inactive" to="/cadastro">Cadastro</Link>
      </div>

      <form onSubmit={entrar} noValidate>
        <Campo id="email" label="Email" tipo="email" placeholder="Digite seu email" valor={valores.email}
          aoMudar={(v) => alterar('email', v)} comErro={erro('email')} mensagemErro="Digite um email válido." />
        <Campo id="senha" label="Senha" tipo="password" placeholder="Digite sua senha" valor={valores.senha}
          aoMudar={(v) => alterar('senha', v)} comErro={erro('senha')} mensagemErro="Digite sua senha." />

        <a className="forgot" href="#" onClick={esqueciSenha}>Esqueceu sua senha?</a>

        <button className="cta" type="submit" disabled={enviando}>Entrar</button>
      </form>

      <p className="or-line">Ou entre com:</p>
      <GoogleBotao rotulo="Entrar com Google" aoClicar={entrarComGoogle} />

      <p className="switch-line">Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </div>
  );
}
