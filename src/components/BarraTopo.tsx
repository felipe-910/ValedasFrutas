import SetaVoltar from './SetaVoltar';

interface Props {
  titulo: string;
  voltarPara: string;
}

// Cabeçalho verde com seta de voltar + título em sticker (telas internas)
export default function BarraTopo({ titulo, voltarPara }: Props) {
  return (
    <div className="child-topbar">
      <SetaVoltar to={voltarPara} />
      <h1 className="sticker-heading"><span className="sticker-line on-green">{titulo}</span></h1>
      <span style={{ width: 20 }} />
    </div>
  );
}
