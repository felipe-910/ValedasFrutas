import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { usePagina } from '../lib/usePagina';
import { logoutUser } from '../services/auth';
import { listarFilhos } from '../services/filhos';
import { aceitarTermos } from '../services/termos';

export default function AceitarTermos() {
  usePagina('Política de Privacidade', 'page-white', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function aceitar() {
    setEnviando(true);
    try {
      await aceitarTermos();
      const filhos = await listarFilhos();
      navigate(filhos.length > 0 ? '/home' : '/novo-pequeno');
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível registrar o aceite. Tente novamente.');
      setEnviando(false);
    }
  }

  async function recusar() {
    await logoutUser();
    navigate('/');
  }

  return (
    <div className="wrap">
      <img className="logo small" src="/logo.png" alt="Vale das Frutas" />

      <h1 className="sticker-heading" style={{ textAlign: 'center' }}>
        <span className="sticker-line on-green">Antes de começar</span>
      </h1>
      <p className="termos-welcome">Precisamos que você leia e aceite a nossa Política de Privacidade para continuar.</p>

      <div className="termos-caixa">
        <p className="tit">O que coletamos</p>
        <p>Do responsável: nome, e-mail e senha. Da criança: nome e data de nascimento. O app também guarda o desempenho nos minijogos, as metas e as refeições registradas.</p>
        <p className="tit">Para que usamos</p>
        <p>Só para o funcionamento do Vale das Frutas e para você acompanhar a criança. Não coletamos nada sem uma finalidade ligada ao app.</p>
        <p className="tit">Compartilhamento</p>
        <p>O app é gratuito, não tem anúncios e não compartilha dados pessoais com outras empresas para fins comerciais ou publicitários.</p>
        <p className="tit">Seus direitos</p>
        <p>Você pode excluir o perfil da criança a qualquer momento pela área parental e exercer os direitos previstos na LGPD.</p>
      </div>

      <Link className="termos-link" to="/termos">Ler a política completa</Link>

      <label className="terms">
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
        <span>Li e aceito a Política de Privacidade e Proteção de Dados</span>
      </label>

      <button className="cta" type="button" disabled={!aceito || enviando} onClick={aceitar}>Aceitar e continuar</button>
      <button className="btn btn-outline" type="button" style={{ marginTop: 12 }} onClick={recusar}>Recusar e sair</button>
    </div>
  );
}
