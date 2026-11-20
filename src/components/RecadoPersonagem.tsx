import { useMemo } from 'react';
import avatarAlice from '../jogos/historia/assets/alice-avatar.png';
import avatarLuca from '../jogos/historia/assets/luca-avatar.png';
import { gerarRecado, narradorDoAvatar } from '../lib/recadoAlimentacao';
import type { FilhoAtivo, Refeicao } from '../types';

const PERSONAGENS = {
  luca: { nome: 'Luca', titulo: 'Recado do Luca', avatar: avatarLuca },
  alice: { nome: 'Alice', titulo: 'Recado da Alice', avatar: avatarAlice }
};

function IconeCerto() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function IconeAtencao() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 6v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><circle cx="12" cy="18.5" r="1.8" fill="currentColor" /></svg>;
}

// Recado sobre a alimentação dos últimos 7 dias (sempre 7, mesmo com o painel em 30 dias).
// Quem fala é o personagem que a criança escolheu: o Luca ou a Alice.
export default function RecadoPersonagem({ refeicoes, filho }: { refeicoes: Refeicao[]; filho: FilhoAtivo }) {
  const narrador = narradorDoAvatar(filho.avatar);
  const p = PERSONAGENS[narrador];
  const recado = useMemo(() => gerarRecado(refeicoes, filho.nome, narrador), [refeicoes, filho.nome, narrador]);
  const temDados = recado.clima !== 'sem_dados';

  return (
    <section className={`recado tema-${narrador} clima-${recado.clima}`} aria-label={p.titulo}>
      <header className="recado-capa">
        <img className="recado-avatar" src={p.avatar} alt={p.nome} width={68} height={68} />
        <div className="recado-capa-textos">
          <span className="recado-kicker">{p.titulo}</span>
          <h2 className="recado-titulo">Como {filho.nome} comeu</h2>
          <span className="recado-periodo">Últimos 7 dias</span>
          {temDados && <span className="recado-clima">{recado.rotuloClima}</span>}
        </div>
      </header>

      <p className="recado-balao">{recado.abertura}</p>

      {temDados && (
        <div className="recado-numeros">
          <div><b>{recado.refeicoes}</b><span>{recado.refeicoes === 1 ? 'refeição' : 'refeições'}</span></div>
          <div><b>{recado.dias}/7</b><span>dias com registro</span></div>
          <div><b>{recado.pctComeuTudo === null ? '—' : `${recado.pctComeuTudo}%`}</b><span>comeu tudo</span></div>
        </div>
      )}

      {recado.positivos.length > 0 && (
        <div className="recado-lista bom">
          <h3>Indo bem</h3>
          <ul>
            {recado.positivos.map((t) => <li key={t}><span className="recado-icone"><IconeCerto /></span><span>{t}</span></li>)}
          </ul>
        </div>
      )}
      {recado.atencao.length > 0 && (
        <div className="recado-lista atencao">
          <h3>Para prestar atenção</h3>
          <ul>
            {recado.atencao.map((t) => <li key={t}><span className="recado-icone"><IconeAtencao /></span><span>{t}</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
