import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Campo from '../components/Campo';
import SetaVoltar from '../components/SetaVoltar';
import { useToast } from '../context/ToastContext';
import { useFormulario } from '../lib/useFormulario';
import { usePagina } from '../lib/usePagina';
import { confirmarNovaSenha, traduzErro, verificarCodigoRedefinicao } from '../services/auth';
import { codigoDoErro } from '../services/erros';

type Estado = 'verificando' | 'invalido' | 'formulario' | 'sucesso';

export default function RedefinirSenha() {
  usePagina('Redefinir senha', 'page-white', '#ffffff');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [params] = useSearchParams();
  const modo = params.get('mode');
  const oobCode = params.get('oobCode');

  const [estado, setEstado] = useState<Estado>('verificando');
  const [msgInvalido, setMsgInvalido] = useState('Este link de redefinição é inválido ou já expirou.');
  const [emailConta, setEmailConta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { valores, alterar, erro, validarTudo } = useFormulario(
    { novaSenha: '', confirmarSenha: '' },
    (v) => ({ novaSenha: v.novaSenha.length < 6, confirmarSenha: v.confirmarSenha.length < 6 || v.confirmarSenha !== v.novaSenha })
  );

  // Confere o link (código oobCode) assim que a tela abre
  useEffect(() => {
    let ativo = true;
    (async () => {
      if (modo !== 'resetPassword' || !oobCode) {
        setMsgInvalido('Este link de redefinição é inválido ou está incompleto.');
        setEstado('invalido');
        return;
      }
      try {
        const email = await verificarCodigoRedefinicao(oobCode);
        if (!ativo) return;
        setEmailConta(email);
        setEstado('formulario');
      } catch (err) {
        if (!ativo) return;
        setMsgInvalido(traduzErro(codigoDoErro(err)));
        setEstado('invalido');
      }
    })();
    return () => { ativo = false; };
  }, [modo, oobCode]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!validarTudo() || !oobCode) return;
    setEnviando(true);
    try {
      await confirmarNovaSenha(oobCode, valores.novaSenha);
      setEstado('sucesso');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
      setEnviando(false);
    }
  }

  return (
    <div className="wrap">
      <SetaVoltar to="/login" />
      <img className="logo small" src="/logo.png" alt="Vale das Frutas" />

      <h1 className="sticker-heading" style={{ textAlign: 'center' }}><span className="sticker-line on-green">Redefinir senha</span></h1>

      {estado === 'verificando' && (
        <div className="state-box">
          <div className="state-spinner" />
          <p>Verificando o link de redefinição...</p>
        </div>
      )}

      {estado === 'invalido' && (
        <>
          <div className="state-box"><p>{msgInvalido}</p></div>
          <Link className="cta" to="/recuperar-senha" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', marginTop: 10 }}>
            Solicitar novo link
          </Link>
        </>
      )}

      {estado === 'formulario' && (
        <div>
          <p className="recovery-hint">Defina uma nova senha para a conta abaixo.</p>
          <p className="redefine-email">{emailConta}</p>

          <form onSubmit={salvar} noValidate>
            <Campo id="novaSenha" label="Nova senha" tipo="password" placeholder="Digite a nova senha" valor={valores.novaSenha}
              aoMudar={(v) => alterar('novaSenha', v)} comErro={erro('novaSenha')} mensagemErro="A senha deve ter pelo menos 6 caracteres." />
            <Campo id="confirmarSenha" label="Confirmar nova senha" tipo="password" placeholder="Digite a nova senha novamente" valor={valores.confirmarSenha}
              aoMudar={(v) => alterar('confirmarSenha', v)} comErro={erro('confirmarSenha')} mensagemErro="As senhas digitadas não coincidem." />
            <button className="cta" type="submit" disabled={enviando}>Salvar nova senha</button>
          </form>
        </div>
      )}

      {estado === 'sucesso' && (
        <div className="state-box"><p>Senha redefinida com sucesso! Redirecionando para o login...</p></div>
      )}
    </div>
  );
}
