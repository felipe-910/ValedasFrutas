import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Campo from '../components/Campo';
import GoogleBotao from '../components/GoogleBotao';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { emailValido, useFormulario } from '../lib/useFormulario';
import { usePagina } from '../lib/usePagina';
import { loginWithGoogle, registerUser, traduzErro } from '../services/auth';
import { codigoDoErro } from '../services/erros';
import { destinoAposLogin } from '../services/filhos';

export default function Cadastro() {
  usePagina('Criar conta', 'page-white', '#ffffff');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [enviando, setEnviando] = useState(false);

  const { valores, alterar, erro, validarTudo } = useFormulario(
    { nome: '', email: '', senha: '' },
    (v) => ({ nome: v.nome.trim().length < 2, email: !emailValido(v.email), senha: v.senha.length < 6 })
  );

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    if (!validarTudo()) return;
    setEnviando(true);
    try {
      await registerUser(valores.nome.trim(), valores.email.trim(), valores.senha);
      mostrarToast('Conta criada! Redirecionando...');
      setTimeout(async () => navigate(await destinoAposLogin(), { replace: true }), 1200);
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    } finally {
      setEnviando(false);
    }
  }

  async function cadastrarComGoogle() {
    try {
      await loginWithGoogle();
      mostrarToast('Conta criada com Google!');
      setTimeout(async () => navigate(await destinoAposLogin(), { replace: true }), 800);
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    }
  }

  return (
    <div className="wrap">
      <SetaVoltar to="/" />
      <img className="logo small" src="/logo.png" alt="Vale das Frutas" />

      <div className="tabs">
        <Link className="tab inactive" to="/login">Login</Link>
        <Link className="tab active" to="/cadastro">Cadastro</Link>
      </div>

      <form onSubmit={cadastrar} noValidate>
        <Campo id="nome" label="Nome" placeholder="Digite seu nome" valor={valores.nome}
          aoMudar={(v) => alterar('nome', v)} comErro={erro('nome')} mensagemErro="Digite seu nome completo." />
        <Campo id="email" label="Email" tipo="email" placeholder="Digite seu email" valor={valores.email}
          aoMudar={(v) => alterar('email', v)} comErro={erro('email')} mensagemErro="Digite um email válido." />
        <Campo id="senha" label="Senha" tipo="password" placeholder="Digite sua senha" valor={valores.senha}
          aoMudar={(v) => alterar('senha', v)} comErro={erro('senha')} mensagemErro="A senha deve ter pelo menos 6 caracteres." />


        <button className="cta" type="submit" disabled={enviando}>Cadastrar</button>
      </form>

      <p className="or-line">ou cadastre-se com:</p>
      <GoogleBotao rotulo="Cadastrar com Google" aoClicar={cadastrarComGoogle} />
    </div>
  );
}
