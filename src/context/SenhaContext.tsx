// Janelinhas de senha da área dos pais: voltar da área da criança, criar senha (quem entrou com o Google)
// e alterar senha. Todas devolvem uma Promise: true se deu certo, false se a pessoa cancelou.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { auth } from '../firebase';
import { temSenha, verificarSenha, definirSenha, alterarSenha, resetPassword, traduzErro } from '../services/auth';
import { codigoDoErro } from '../services/erros';

const SENHA_MIN = 6;

interface CampoSenha {
  id: string;
  label: string;
  placeholder?: string;
  auto?: string;
}

interface ConfigModal {
  titulo: string;
  texto: string;
  campos: CampoSenha[];
  botao: string;
  aoEnviar: (valores: Record<string, string>) => Promise<void>;
  linkEsqueci?: boolean; // mostra "Esqueci minha senha"
}

interface SenhaApi {
  pedirSenhaDosPais: () => Promise<boolean>;
  criarSenhaDosPais: () => Promise<boolean>;
  alterarSenhaDosPais: () => Promise<boolean>;
}

const SenhaContext = createContext<SenhaApi | null>(null);

function mensagemDeErro(err: unknown): string {
  const codigo = codigoDoErro(err);
  if (codigo) return traduzErro(codigo);
  return (err instanceof Error && err.message) || 'Algo deu errado. Tente de novo.';
}

const SENHA_ERRADA = ['auth/wrong-password', 'auth/invalid-credential', 'auth/user-mismatch'];

// Confere a senha atual e traduz "senha errada" para uma mensagem clara
async function conferirSenha(senha: string): Promise<void> {
  if (!senha) throw new Error('Digite a sua senha.');
  try {
    await verificarSenha(senha);
  } catch (err) {
    const codigo = codigoDoErro(err);
    if (codigo && [...SENHA_ERRADA, 'auth/missing-password'].includes(codigo)) throw new Error('Senha incorreta.');
    throw err;
  }
}

function validarNovaSenha(nova: string, confirmar: string): void {
  if (!nova || nova.length < SENHA_MIN) throw new Error(`A senha deve ter pelo menos ${SENHA_MIN} caracteres.`);
  if (nova !== confirmar) throw new Error('As senhas digitadas não coincidem.');
}

// ---------- A janela em si ----------
function JanelaSenha({ config, aoFechar }: { config: ConfigModal; aoFechar: (ok: boolean) => void }) {
  const { titulo, texto, campos, botao, aoEnviar, linkEsqueci } = config;
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.id, ''])));
  const [msg, setMsg] = useState<{ texto: string; tipo: 'erro' | 'ok' } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const primeiro = useRef<HTMLInputElement>(null);
  const anterior = useRef<Element | null>(null);

  useEffect(() => {
    anterior.current = document.activeElement;
    primeiro.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(false); };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      if (anterior.current instanceof HTMLElement) anterior.current.focus();
    };
  }, [aoFechar]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      await aoEnviar(valores);
      aoFechar(true);
    } catch (err) {
      setMsg({ texto: mensagemDeErro(err), tipo: 'erro' });
      setEnviando(false);
      if (campos.length === 1) setValores({ [campos[0].id]: '' }); // senha errada: limpa e deixa digitar de novo
      primeiro.current?.focus();
    }
  }

  async function esqueci() {
    const email = auth.currentUser?.email;
    if (!email) return;
    setEnviandoEmail(true);
    try {
      await resetPassword(email);
      setMsg({ texto: `Enviamos um e-mail para ${email} com o link para criar uma nova senha.`, tipo: 'ok' });
    } catch (err) {
      setMsg({ texto: mensagemDeErro(err), tipo: 'erro' });
    } finally {
      setEnviandoEmail(false);
    }
  }

  return (
    <div className="senha-overlay" onClick={(e) => { if (e.target === e.currentTarget) aoFechar(false); }}>
      <form className="senha-modal" role="dialog" aria-modal="true" aria-labelledby="senhaTitulo" noValidate onSubmit={enviar}>
        <h2 className="senha-titulo" id="senhaTitulo">{titulo}</h2>
        <p className="senha-texto">{texto}</p>

        {campos.map((c, i) => (
          <div className="field" key={c.id}>
            <label htmlFor={`senha_${c.id}`}>{c.label}</label>
            <input
              ref={i === 0 ? primeiro : undefined}
              type="password"
              id={`senha_${c.id}`}
              placeholder={c.placeholder || ''}
              autoComplete={c.auto || 'current-password'}
              value={valores[c.id] ?? ''}
              onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value }))}
            />
          </div>
        ))}

        <p className="senha-msg" role="alert" hidden={!msg} data-tipo={msg?.tipo}>{msg?.texto}</p>

        {linkEsqueci && (
          <div className="senha-extra">
            <button type="button" className="senha-link" disabled={enviandoEmail} onClick={esqueci}>Esqueci minha senha</button>
          </div>
        )}

        <button className="cta senha-enviar" type="submit" disabled={enviando}>{enviando ? 'Aguarde...' : botao}</button>
        <button className="btn btn-outline senha-cancelar" type="button" onClick={() => aoFechar(false)}>Cancelar</button>
      </form>
    </div>
  );
}

// ---------- Provider: guarda a janela aberta e expõe as três funções ----------
export function SenhaProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState<ConfigModal | null>(null);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const abrirModal = useCallback((config: ConfigModal) => {
    return new Promise<boolean>((resolver) => {
      resolverRef.current = resolver;
      setAberto(config);
    });
  }, []);

  const api = useMemo<SenhaApi>(() => {
    // Quem entrou com o Google cria a senha (obrigatório para abrir a área da criança)
    const criarSenhaDosPais = () => abrirModal({
      titulo: 'Crie uma senha',
      texto: 'Você entrou com o Google e ainda não tem senha. Crie uma para proteger a área dos pais: ela será pedida sempre que alguém tentar voltar da área da criança.',
      campos: [
        { id: 'nova', label: 'Nova senha', placeholder: `Mínimo de ${SENHA_MIN} caracteres`, auto: 'new-password' },
        { id: 'confirmar', label: 'Confirmar senha', placeholder: 'Digite a senha de novo', auto: 'new-password' }
      ],
      botao: 'Criar senha',
      aoEnviar: async ({ nova, confirmar }) => {
        validarNovaSenha(nova, confirmar);
        await definirSenha(nova);
      }
    });

    return {
      // Pede a senha para voltar da área da criança para a área dos pais
      pedirSenhaDosPais: () => abrirModal({
        titulo: 'Área dos pais',
        texto: 'Digite a sua senha para voltar para a área dos pais.',
        campos: [{ id: 'senha', label: 'Senha', placeholder: 'Sua senha', auto: 'current-password' }],
        botao: 'Entrar',
        aoEnviar: ({ senha }) => conferirSenha(senha),
        linkEsqueci: true
      }),
      criarSenhaDosPais,
      // Alterar a senha (ou criar, se a conta ainda não tem uma)
      alterarSenhaDosPais: () => {
        if (!temSenha()) return criarSenhaDosPais();
        return abrirModal({
          titulo: 'Alterar senha',
          texto: 'Digite a senha atual e escolha a nova.',
          campos: [
            { id: 'atual', label: 'Senha atual', placeholder: 'Sua senha atual', auto: 'current-password' },
            { id: 'nova', label: 'Nova senha', placeholder: `Mínimo de ${SENHA_MIN} caracteres`, auto: 'new-password' },
            { id: 'confirmar', label: 'Confirmar nova senha', placeholder: 'Digite a nova senha de novo', auto: 'new-password' }
          ],
          botao: 'Salvar nova senha',
          aoEnviar: async ({ atual, nova, confirmar }) => {
            if (!atual) throw new Error('Digite a senha atual.');
            validarNovaSenha(nova, confirmar);
            if (nova === atual) throw new Error('A nova senha precisa ser diferente da atual.');
            try {
              await alterarSenha(atual, nova);
            } catch (err) {
              const codigo = codigoDoErro(err);
              if (codigo && SENHA_ERRADA.includes(codigo)) throw new Error('A senha atual está incorreta.');
              throw err;
            }
          }
        });
      }
    };
  }, [abrirModal]);

  const fechar = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setAberto(null);
  }, []);

  return (
    <SenhaContext.Provider value={api}>
      {children}
      {aberto && <JanelaSenha config={aberto} aoFechar={fechar} />}
    </SenhaContext.Provider>
  );
}

export function useSenha(): SenhaApi {
  const ctx = useContext(SenhaContext);
  if (!ctx) throw new Error('useSenha precisa estar dentro de <SenhaProvider>.');
  return ctx;
}
