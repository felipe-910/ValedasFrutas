import { useMemo } from 'react';
import avatarLuca from '../jogos/historia/assets/luca-avatar.png';
import { gerarRecadoLuca } from '../lib/feedbackLuca';
import type { Refeicao } from '../types';

// "Recado do Luca": o Luca conta como está a alimentação da criança nos últimos 7 dias
// (sempre 7 dias, mesmo com o painel em 30 dias).
export default function RecadoLuca({ refeicoes, nome }: { refeicoes: Refeicao[]; nome: string }) {
  const recado = useMemo(() => gerarRecadoLuca(refeicoes, nome), [refeicoes, nome]);

  return (
    <section className={`luca-recado clima-${recado.clima}`} aria-label="Recado do Luca">
      <div className="luca-recado-topo">
        <img className="luca-recado-avatar" src={avatarLuca} alt="" width={56} height={56} />
        <div className="luca-recado-titulos">
          <h2 className="luca-recado-titulo">Recado do Luca</h2>
          <span className="luca-recado-periodo">Últimos 7 dias{recado.refeicoes ? ` · ${recado.refeicoes} ${recado.refeicoes === 1 ? 'refeição' : 'refeições'} em ${recado.dias} ${recado.dias === 1 ? 'dia' : 'dias'}` : ''}</span>
        </div>
        {recado.clima !== 'sem_dados' && <span className="luca-recado-clima">{recado.rotuloClima}</span>}
      </div>

      <p className="luca-recado-fala">{recado.abertura}</p>

      {recado.positivos.length > 0 && (
        <div className="luca-recado-bloco bom">
          <p className="luca-recado-bloco-titulo">Indo bem</p>
          <ul>{recado.positivos.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {recado.atencao.length > 0 && (
        <div className="luca-recado-bloco atencao">
          <p className="luca-recado-bloco-titulo">Para prestar atenção</p>
          <ul>{recado.atencao.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      <p className="luca-recado-dica">{recado.dica}</p>
    </section>
  );
}
