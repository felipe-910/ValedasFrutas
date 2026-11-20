import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BarraTopo from '../components/BarraTopo';
import GradeCores from '../components/GradeCores';
import Icone from '../components/Icone';
import PerfilMini from '../components/PerfilMini';
import { useToast } from '../context/ToastContext';
import { CORES_PEQUENO } from '../lib/cores';
import { calcularIdade, formatarIdade, paraISO } from '../lib/idade';
import { limparFilhoAtivo } from '../lib/sessao';
import { useFilhoAtivo } from '../lib/useFilhoAtivo';
import { usePagina } from '../lib/usePagina';
import { useTutorialDaTela } from '../context/TutorialContext';
import { deleteFilho, updateFilho } from '../services/filhos';

const AVATARES = ['1', '2'];

export default function Configuracoes() {
  usePagina('Configurações', 'home-page', '#6fa981');
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [filho, atualizarFilho] = useFilhoAtivo();
  const salvandoCor = useRef(false);

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [avatar, setAvatar] = useState('');
  const [salvando, setSalvando] = useState(false);

  useTutorialDaTela('configuracoes', !editando); // na primeira vez, a Alice explica esta tela
  if (!filho) return <Navigate to="/home" replace />;

  async function escolherCor(cor: string) {
    if (!filho || salvandoCor.current || cor === filho.cor) return;
    const anterior = filho;
    atualizarFilho({ ...filho, cor }); // mostra já, e desfaz abaixo se não conseguir salvar
    salvandoCor.current = true;
    try {
      await updateFilho(filho.id, { cor });
    } catch (err) {
      console.error(err);
      atualizarFilho(anterior);
      mostrarToast('Não foi possível salvar a cor. Tente de novo.');
    } finally {
      salvandoCor.current = false;
    }
  }

  function abrirEdicao() {
    if (!filho) return;
    setNome(filho.nome);
    setDataNascimento(filho.dataNascimento || '');
    setAvatar(filho.avatar || '');
    setEditando(true);
  }

  async function salvarInformacoes(e: FormEvent) {
    e.preventDefault();
    if (!filho || salvando) return;
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) {
      mostrarToast('Digite o nome da criança.');
      return;
    }
    if (!dataNascimento) {
      mostrarToast('Informe a data de nascimento.');
      return;
    }
    if (!calcularIdade(dataNascimento)) {
      mostrarToast('A data de nascimento não pode estar no futuro.');
      return;
    }
    if (!avatar) {
      mostrarToast('Escolha um personagem.');
      return;
    }
    setSalvando(true);
    try {
      await updateFilho(filho.id, { nome: nomeLimpo, dataNascimento, avatar });
      atualizarFilho({ ...filho, nome: nomeLimpo, dataNascimento, avatar });
      mostrarToast('Informações atualizadas!');
      setEditando(false);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const erroData = dataNascimento && !calcularIdade(dataNascimento) ? 'A data de nascimento não pode estar no futuro.' : '';
  const textoIdadeEdicao = erroData || (dataNascimento ? `Idade: ${formatarIdade(calcularIdade(dataNascimento))}` : '');

  async function excluir() {
    if (!filho) return;
    if (!confirm(`Tem certeza que deseja excluir o cadastro de ${filho.nome}? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteFilho(filho.id);
      limparFilhoAtivo();
      mostrarToast('Cadastro excluído.');
      setTimeout(() => navigate('/home'), 1000);
    } catch (err) {
      console.error(err);
      mostrarToast('Não foi possível excluir. Tente novamente.');
    }
  }

  return (
    <>
      <BarraTopo titulo="Configurações" voltarPara="/crianca" />

      <div className="child-body">
        <PerfilMini filho={filho} mostrarIdade estilo={{ marginBottom: 20 }} />

        {editando ? (
          <form className="settings-card kid-edit-form" onSubmit={salvarInformacoes} noValidate>
            <p className="settings-card-title">Editar informações</p>

            <div className="notched-field">
              <span className="notch-label">Nome da criança</span>
              <input id="editNome" name="editNome" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div className="notched-field">
              <span className="notch-label">Data de nascimento</span>
              <input id="editData" name="editData" type="date" max={paraISO(new Date())} value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </div>
            <p className={`idade-calculada${erroData ? ' erro' : ''}`} aria-live="polite">{textoIdadeEdicao}</p>

            <p className="kid-edit-label">Personagem</p>
            <div className="avatar-grid">
              {AVATARES.map((n) => (
                <button
                  key={n}
                  className={`avatar-option${avatar === n ? ' selected' : ''}`}
                  type="button"
                  aria-label={`Personagem ${n}`}
                  aria-pressed={avatar === n}
                  style={{ backgroundImage: `url('/sprite/avatar${n}.jpg')` }}
                  onClick={() => setAvatar(n)}
                />
              ))}
            </div>

            <button className="cta" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
            <button className="btn btn-outline" type="button" style={{ marginTop: 12 }} onClick={() => setEditando(false)}>Cancelar</button>
          </form>
        ) : (
          <>
            <div className="settings-card">
              <p className="settings-card-title">Cor principal</p>
              <GradeCores cores={CORES_PEQUENO} selecionada={filho.cor} aoEscolher={escolherCor} />
            </div>

            <div className="settings-list">
              <button className="settings-btn" type="button" onClick={abrirEdicao}>
                <span className="settings-icon"><Icone nome="mdi:account-edit" cor="000000" tamanho={18} /></span>
                Editar informações
              </button>
              <button className="settings-btn danger" type="button" onClick={excluir}>
                <span className="settings-icon"><Icone nome="mdi:delete" cor="000000" tamanho={18} /></span>
                Excluir conta
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
