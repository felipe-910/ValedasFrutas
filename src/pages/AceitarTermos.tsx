import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { usePagina } from '../lib/usePagina';
import { logoutUser } from '../services/auth';
import { listarFilhos } from '../services/filhos';
import { aceitarTermos } from '../services/termos';

export default function AceitarTermos() {
  usePagina('Termos de Uso', 'page-white', '#6fa981');
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
      <p className="termos-welcome">Precisamos que você leia e aceite nossos Termos de Uso para continuar.</p>

      <div className="termos-caixa">
        <p className="tit">1. Uso da conta</p>
        <p>Você é responsável por manter os dados de acesso da sua conta em segurança e por todas as informações cadastradas sobre os seus pequenos.</p>
        <p className="tit">2. Dados dos pequenos</p>
        <p>As informações cadastradas (metas, refeições e desempenho) são usadas apenas para o funcionamento do app e ficam visíveis somente para o responsável que as cadastrou.</p>
        <p className="tit">3. Privacidade</p>
        <p>Não compartilhamos os dados cadastrados com terceiros. Você pode excluir sua conta e seus dados a qualquer momento pela tela de perfil.</p>
        <p className="tit">4. Alterações</p>
        <p>Estes termos podem ser atualizados conforme o app evolui. Recomendamos revisá-los de tempos em tempos pela tela de perfil.</p>
      </div>

      <Link className="termos-link" to="/termos">Ler termos completos</Link>

      <label className="terms">
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
        <span>Li e aceito os Termos de Uso e a Política de Privacidade</span>
      </label>

      <button className="cta" type="button" disabled={!aceito || enviando} onClick={aceitar}>Aceitar e continuar</button>
      <button className="btn btn-outline" type="button" style={{ marginTop: 12 }} onClick={recusar}>Recusar e sair</button>
    </div>
  );
}
