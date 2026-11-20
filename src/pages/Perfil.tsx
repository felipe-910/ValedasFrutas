import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Campo from '../components/Campo';
import Icone from '../components/Icone';
import BarraTopo from '../components/BarraTopo';
import { useAuth } from '../context/AuthContext';
import { useSenha } from '../context/SenhaContext';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import { guardarPerfilLocal, lerPerfilLocal } from '../lib/sessao';
import { useFormulario } from '../lib/useFormulario';
import { usePagina } from '../lib/usePagina';
import { deleteAccount, temSenha, traduzErro, updateUserProfile } from '../services/auth';
import { codigoDoErro } from '../services/erros';

// Redimensiona a imagem escolhida antes de salvar (evita guardar arquivos enormes)
function redimensionarImagem(file: File, tamanhoMax = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const escala = Math.min(1, tamanhoMax / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(file);
  });
}

export default function Perfil() {
  usePagina('Meu perfil', 'home-page', '#6fa981');
  const { user } = useAuth();
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const { alterarSenhaDosPais } = useSenha();
  const tutorial = useTutorial();

  const uid = user?.uid ?? '';
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(user?.displayName || '');
  const [foto, setFoto] = useState<string | null>(() => lerPerfilLocal(uid, 'foto') || user?.photoURL || null);
  const [temSenhaAgora, setTemSenhaAgora] = useState(temSenha());
  const arquivoRef = useRef<HTMLInputElement>(null);

  const { valores, setValores, alterar, erro, validarTudo } = useFormulario(
    { nome: user?.displayName || '' },
    (v) => ({ nome: v.nome.trim().length < 2 })
  );

  function abrirEdicao() {
    setValores({ nome });
    setEditando(true);
  }

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      mostrarToast('Escolha um arquivo de imagem.');
      return;
    }
    try {
      const dataUrl = await redimensionarImagem(arquivo);
      guardarPerfilLocal(uid, 'foto', dataUrl);
      setFoto(dataUrl);
      mostrarToast('Foto atualizada!');
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível atualizar a foto.');
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!validarTudo()) return;
    const novoNome = valores.nome.trim();
    try {
      await updateUserProfile({ nome: novoNome });
      setNome(novoNome);
      mostrarToast('Perfil atualizado!');
      setEditando(false);
    } catch (err) {
      mostrarToast(traduzErro(codigoDoErro(err)));
    }
  }

  async function mudarSenha() {
    const tinhaSenha = temSenha();
    const ok = await alterarSenhaDosPais();
    if (!ok) return;
    setTemSenhaAgora(temSenha());
    mostrarToast(tinhaSenha ? 'Senha alterada!' : 'Senha criada!');
  }

  async function excluirConta() {
    if (!confirm('Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.')) return;
    try {
      await deleteAccount();
      mostrarToast('Conta excluída.');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      const codigo = codigoDoErro(err);
      mostrarToast(traduzErro(codigo));
      if (codigo === 'auth/requires-recent-login') setTimeout(() => navigate('/login'), 1800);
    }
  }

  // o tutorial geral recomeça na home e o de cada tela volta a aparecer na próxima visita
  function verTutorial() {
    tutorial.reverTudo();
    navigate('/home', { state: { tutorial: true } });
  }

  const nomeMostrado = nome || 'Sem nome cadastrado';

  return (
    <>
      <BarraTopo titulo="Meu perfil" voltarPara="/home" />

      <div className="child-body">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar" style={foto ? { backgroundImage: `url('${foto}')` } : undefined} />
          <button className="profile-avatar-cam" type="button" aria-label="Trocar foto" onClick={() => arquivoRef.current?.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h3l2-2h6l2 2h3v11H4V8z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="13.5" r="3.2" stroke="#fff" strokeWidth="2" />
            </svg>
          </button>
          <input type="file" ref={arquivoRef} accept="image/*" hidden onChange={escolherFoto} />
        </div>
        <p className="profile-name-line">{nomeMostrado}</p>
        <p className="profile-email-line">{user?.email || ''}</p>

        {!editando && (
          <>
            <button className="cta" type="button" onClick={abrirEdicao}>Editar perfil</button>

            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="row-icon"><Icone nome="mdi:account-outline" cor="6fa981" /></span>
                <span className="row-text">
                  <span className="row-label">Nome completo:</span>
                  <span className="row-value">{nomeMostrado}</span>
                </span>
                <span className="row-chevron">&#8250;</span>
              </div>
              <div className="profile-info-row">
                <span className="row-icon"><Icone nome="mdi:email-outline" cor="6fa981" /></span>
                <span className="row-text">
                  <span className="row-label">E-mail:</span>
                  <span className="row-value">{user?.email || '—'}</span>
                </span>
                <span className="row-chevron">&#8250;</span>
              </div>
              <button className="profile-info-row" type="button" onClick={mudarSenha}>
                <span className="row-icon"><Icone nome="mdi:lock-outline" cor="6fa981" /></span>
                <span className="row-text">
                  <span className="row-label">Senha da área dos pais</span>
                  <span className="row-value">{temSenhaAgora ? 'Alterar senha' : 'Criar senha'}</span>
                </span>
                <span className="row-chevron">&#8250;</span>
              </button>
              <button className="profile-info-row" type="button" onClick={verTutorial}>
                <span className="row-icon"><Icone nome="mdi:help-circle-outline" cor="6fa981" /></span>
                <span className="row-text">
                  <span className="row-label">Tutorial</span>
                  <span className="row-value">Ver o tutorial novamente</span>
                </span>
                <span className="row-chevron">&#8250;</span>
              </button>
              <Link className="profile-info-row" to="/termos" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <span className="row-icon"><Icone nome="mdi:file-document-outline" cor="6fa981" /></span>
                <span className="row-text">
                  <span className="row-label">Termos de uso</span>
                  <span className="row-value">Ler termos de uso</span>
                </span>
                <span className="row-chevron">&#8250;</span>
              </Link>
            </div>
          </>
        )}

        {editando && (
          <form className="profile-edit-form" onSubmit={salvar} noValidate>
            <Campo id="novoNome" label="Nome completo" placeholder="Seu nome" valor={valores.nome}
              aoMudar={(v) => alterar('nome', v)} comErro={erro('nome')} mensagemErro="Digite um nome válido." />
            <Campo id="emailCampo" label="E-mail" tipo="email" valor={user?.email || ''} aoMudar={() => {}} desabilitado />
            <button className="cta" type="submit">Salvar alterações</button>
            <button className="btn btn-outline" type="button" style={{ marginTop: 12 }} onClick={() => setEditando(false)}>Cancelar</button>
          </form>
        )}

        <div className="profile-danger-zone">
          <button className="btn-danger" type="button" onClick={excluirConta}>Excluir conta</button>
        </div>
      </div>
    </>
  );
}
