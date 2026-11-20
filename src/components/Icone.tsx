import { iconUrl } from '../lib/icones';
import { ICONES_LOCAIS } from '../lib/iconesLocais';

interface Props {
  nome: string; // "prefixo:icone", ex.: "mdi:food-apple"
  cor?: string; // hex sem "#"
  tamanho?: number;
}

// Os ícones ficam guardados dentro do app (src/lib/iconesLocais.ts), então aparecem mesmo sem internet
// e mesmo se a rede bloquear sites externos. Só se um nome não estiver na lista é que tenta buscar
// no Iconify (precisa de internet).
export default function Icone({ nome, cor, tamanho = 22 }: Props) {
  const local = ICONES_LOCAIS[nome];
  if (!local) {
    return <img className="icon-img" src={iconUrl(nome, cor)} width={tamanho} height={tamanho} alt="" />;
  }
  const traco = local.s
    ? { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    : { fill: 'currentColor' };
  return (
    <svg
      className="icon-img"
      viewBox={local.v}
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      style={{ color: cor ? `#${cor}` : '#000' }}
      {...traco}
      dangerouslySetInnerHTML={{ __html: local.b }}
    />
  );
}
