import { useEffect, useState } from 'react';
import BarraTopo from '../components/BarraTopo';
import Icone from '../components/Icone';
import { useToast } from '../context/ToastContext';
import { formatarData, formatarHora, paraMillis } from '../lib/tempo';
import { usePagina } from '../lib/usePagina';
import { sincronizarTodasAsMetas } from '../services/metas';
import { listarNotificacoes, marcarComoVistas, ultimaVisita, verificarPrazos } from '../services/notificacoes';
import type { Notificacao, TipoNotificacao } from '../types';

interface InfoTipo {
  titulo: string;
  icone: string;
  cor: string;
  fundo: string;
}

// Ícone, cor e título padrão de cada tipo de notificação
const TIPOS: Record<TipoNotificacao, InfoTipo> = {
  login: { titulo: 'Login realizado', icone: 'mdi:login-variant', cor: '4f9366', fundo: '#e9f3ec' },
  meta_criada: { titulo: 'Nova meta criada', icone: 'mdi:flag-variant', cor: '7e8fd6', fundo: '#ecedf8' },
  meta_dia_cumprido: { titulo: 'Mais um dia cumprido!', icone: 'mdi:star', cor: 'f4a53b', fundo: '#fdf0dc' },
  meta_atingida: { titulo: 'Meta atingida!', icone: 'mdi:trophy', cor: 'f4a53b', fundo: '#fdf0dc' },
  meta_progresso_revertido: { titulo: 'Progresso da meta diminuiu', icone: 'mdi:undo-variant', cor: 'b34b4b', fundo: '#f7e3e3' },
  meta_prazo_proximo: { titulo: 'O dia da meta está acabando', icone: 'mdi:clock-alert-outline', cor: 'f2726c', fundo: '#fdeceb' },
  meta_prazo_encerrado: { titulo: 'O prazo da meta acabou', icone: 'mdi:calendar-clock', cor: 'b34b4b', fundo: '#f7e3e3' }
};
const TIPO_PADRAO: InfoTipo = { titulo: 'Notificação', icone: 'mdi:bell-outline', cor: '4f9366', fundo: '#e9f3ec' };

export default function Notificacoes() {
  usePagina('Notificações', 'home-page', '#6fa981');
  const mostrarToast = useToast();
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [visto, setVisto] = useState(0);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        // mostra na hora o que já existe...
        const notificacoes = await listarNotificacoes();
        if (!ativo) return;
        setVisto(ultimaVisita()); // lido ANTES de marcar como vistas, para destacar as novas
        setLista(notificacoes);
        setCarregou(true);
        marcarComoVistas(notificacoes); // zera a bolinha do sininho na home

        // ...e só depois confere metas e prazos (é a parte demorada); se surgir aviso novo, a lista atualiza sozinha
        await sincronizarTodasAsMetas();
        await verificarPrazos(); // cria os avisos de "último dia" / "prazo acabou", se for o caso
        const atualizadas = await listarNotificacoes();
        if (!ativo) return;
        setLista(atualizadas);
        marcarComoVistas(atualizadas);
      } catch (err) {
        console.error(err);
        mostrarToast('Não foi possível carregar as notificações.');
      }
    })();
    return () => { ativo = false; };
  }, [mostrarToast]);

  return (
    <>
      <BarraTopo titulo="Notificações" voltarPara="/home" />

      <div className="child-body">
        {!carregou && <p className="empty-note">Carregando…</p>}
        <div>
          {lista.map((notif) => {
            const info = TIPOS[notif.tipo] || TIPO_PADRAO;
            const nova = paraMillis(notif.criadoEm) > visto;
            const quando = notif.criadoEm ? `${formatarData(notif.criadoEm)} às ${formatarHora(notif.criadoEm)}` : '—';
            return (
              <div className={`notif-card${nova ? ' nova' : ''}`} key={notif.id}>
                <div className="notif-icon" style={{ background: info.fundo }}><Icone nome={info.icone} cor={info.cor} tamanho={20} /></div>
                <div className="notif-info">
                  <p className="notif-title">{notif.titulo || info.titulo}</p>
                  {notif.mensagem && <p className="notif-msg">{notif.mensagem}</p>}
                  <p className="notif-datetime">{quando}</p>
                </div>
                {nova && <span className="notif-dot" aria-label="Nova" />}
              </div>
            );
          })}
        </div>
        <p className="empty-note" style={{ display: carregou && !lista.length ? 'block' : 'none' }}>Nenhuma notificação ainda.</p>
      </div>
    </>
  );
}
