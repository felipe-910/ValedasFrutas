import Icone from './Icone';
import { ICONE_ALIMENTO_PADRAO, alimentoDoCatalogo, useCatalogoAlimentos } from '../lib/useCatalogoAlimentos';

interface Props {
  nome: string; // nome do alimento
  icone?: string; // ícone salvo junto com a refeição (usado se o alimento não estiver no catálogo)
  cor?: string; // cor do ícone (só vale para alimentos sem sprite)
  tamanho?: number;
}

// Mostra o sprite do alimento (o mesmo dos minijogos) quando existe; senão, o ícone.
// A busca é pelo nome, então refeições salvas antes também ganham o sprite.
export default function IconeAlimento({ nome, icone, cor, tamanho = 18 }: Props) {
  const catalogo = useCatalogoAlimentos();
  const alimento = alimentoDoCatalogo(catalogo, nome);
  if (alimento?.imagem) {
    return (
      <img
        className="icon-img food-sprite"
        src={alimento.imagem}
        width={tamanho}
        height={tamanho}
        alt=""
        loading="lazy"
        style={{ objectFit: 'contain' }}
      />
    );
  }
  return <Icone nome={alimento?.icone || icone || ICONE_ALIMENTO_PADRAO} cor={cor} tamanho={tamanho} />;
}
