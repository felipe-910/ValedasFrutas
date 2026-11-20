import BarraTopo from '../components/BarraTopo';
import { usePagina } from '../lib/usePagina';

// Política de Privacidade e Proteção de Dados do Vale das Frutas (Petalplay).
// Cada seção é uma lista de blocos: parágrafo (p), subtítulo (sub) ou lista com marcadores (lista).
type Bloco = { p: string } | { sub: string } | { lista: string[] };

const SECOES: Array<{ titulo: string; blocos: Bloco[] }> = [
  {
    titulo: '1. Seja bem-vindo ao Vale das Frutas!',
    blocos: [
      { p: 'O Vale das Frutas é um aplicativo educativo desenvolvido pela Petalplay, pensado especialmente para crianças de 5 a 8 anos. Por meio de histórias, personagens e minijogos, buscamos tornar a educação alimentar uma experiência divertida, interativa e enriquecedora.' },
      { p: 'Sabemos que, quando se trata de crianças, a segurança e a privacidade precisam estar em primeiro lugar. Por isso, esta Política de Privacidade explica de maneira clara e transparente quais informações são coletadas, como são utilizadas e quais medidas adotamos para protegê-las.' },
      { p: 'Nosso compromisso é respeitar a privacidade dos pequenos usuários e garantir que seus dados sejam tratados com responsabilidade, transparência e cuidado.' }
    ]
  },
  {
    titulo: '2. Quais informações coletamos?',
    blocos: [
      { p: 'Para que o Vale das Frutas funcione corretamente, precisamos de algumas informações básicas.' },
      { sub: 'Informações do responsável:' },
      { lista: ['Nome;', 'Endereço de e-mail;', 'Senha de acesso.'] },
      { p: 'Essas informações são utilizadas para criar e proteger a conta do responsável, permitir o acesso à área parental e possibilitar o gerenciamento dos perfis infantis.' },
      { sub: 'Informações da criança:' },
      { lista: ['Nome;', 'Data de nascimento.'] },
      { p: 'Essas informações são utilizadas para criar o perfil infantil, identificar a faixa etária e organizar a experiência educativa de acordo com a proposta do aplicativo.' },
      { p: 'Além disso, o aplicativo poderá registrar informações relacionadas ao funcionamento de suas atividades, como:' },
      { lista: ['Desempenho nos minijogos;', 'Metas educativas criadas pelo responsável;', 'Refeições registradas na área parental.'] },
      { p: 'Esses registros permitem que o responsável acompanhe a experiência da criança no Vale das Frutas.' }
    ]
  },
  {
    titulo: '3. Por que utilizamos essas informações?',
    blocos: [
      { p: 'Cada informação solicitada possui uma finalidade específica.' },
      { p: 'O nome da criança permite identificar seu perfil dentro do aplicativo, enquanto a data de nascimento auxilia na identificação da faixa etária.' },
      { p: 'O nome e o e-mail do responsável são utilizados para identificar sua conta e permitir o acesso às funcionalidades de gerenciamento parental.' },
      { p: 'As informações sobre o desempenho nos minijogos, as metas e as refeições são utilizadas exclusivamente para disponibilizar as funcionalidades educativas e de acompanhamento oferecidas pelo Vale das Frutas.' },
      { p: 'Não coletamos informações pessoais sem uma finalidade relacionada ao funcionamento do aplicativo.' }
    ]
  },
  {
    titulo: '4. Como protegemos os dados?',
    blocos: [
      { p: 'A segurança das informações é uma prioridade para a Petalplay.' },
      { p: 'O Vale das Frutas prevê a utilização de mecanismos de segurança, incluindo criptografia, proteção das credenciais e restrição de acesso às informações armazenadas.' },
      { p: 'Essas medidas têm como objetivo impedir acessos não autorizados, alterações indevidas, divulgação ou utilização inadequada dos dados pessoais.' },
      { p: 'As informações deverão ser acessadas apenas por sistemas e pessoas devidamente autorizados, conforme as permissões necessárias para o funcionamento e a manutenção do aplicativo.' },
      { p: 'As senhas dos responsáveis deverão ser protegidas por mecanismos seguros de armazenamento, evitando que sejam mantidas em formato legível.' }
    ]
  },
  {
    titulo: '5. Compartilhamento de informações',
    blocos: [
      { p: 'Atualmente, o Vale das Frutas é gratuito, não possui anúncios e não realiza compartilhamento de dados pessoais com outras empresas para fins comerciais ou publicitários.' },
      { p: 'As informações coletadas são utilizadas para o funcionamento do próprio aplicativo e de suas funcionalidades educativas.' },
      { p: 'Caso sejam introduzidos novos serviços, funcionalidades ou parceiros no futuro, esta Política de Privacidade poderá ser atualizada.' },
      { p: 'Qualquer alteração relevante no tratamento dos dados será comunicada aos responsáveis, e novas autorizações serão solicitadas quando exigidas pela legislação.' }
    ]
  },
  {
    titulo: '6. Controle parental e acompanhamento',
    blocos: [
      { p: 'No Vale das Frutas, a criação do perfil infantil é realizada pelo responsável legal.' },
      { p: 'A área parental permite:' },
      { lista: ['Criar e gerenciar o perfil da criança;', 'Acompanhar o desempenho nos minijogos;', 'Criar metas educativas;', 'Registrar refeições;', 'Excluir o perfil infantil.'] },
      { p: 'O responsável permanece como a principal pessoa responsável pelo gerenciamento do perfil da criança dentro do aplicativo.' }
    ]
  },
  {
    titulo: '7. Exclusão das informações',
    blocos: [
      { p: 'O responsável poderá solicitar a exclusão do perfil infantil a qualquer momento por meio da área parental.' },
      { p: 'A solicitação deverá resultar na exclusão dos dados pessoais associados ao perfil, respeitadas as hipóteses legais de conservação previstas na legislação.' },
      { p: 'Nosso objetivo é garantir que os responsáveis possam exercer controle sobre as informações pessoais de seus filhos.' }
    ]
  },
  {
    titulo: '8. Quais são os seus direitos?',
    blocos: [
      { p: 'A Lei Geral de Proteção de Dados Pessoais (LGPD) garante diversos direitos relacionados à privacidade e ao tratamento de dados pessoais.' },
      { p: 'O responsável legal poderá solicitar, conforme aplicável:' },
      { lista: [
        'Confirmação sobre a existência de tratamento de dados;',
        'Acesso às informações pessoais;',
        'Correção de dados incompletos ou incorretos;',
        'Exclusão de dados pessoais, observadas as hipóteses legais;',
        'Informações sobre o tratamento e eventual compartilhamento;',
        'Revogação do consentimento, quando aplicável.'
      ] },
      { p: 'Para exercer esses direitos, o responsável poderá entrar em contato por meio do canal oficial de atendimento relacionado à privacidade.' },
      { p: 'Contato: petalplaytech@gmail.com' }
    ]
  },
  {
    titulo: '9. Compromisso com a legislação',
    blocos: [
      { p: 'O Vale das Frutas busca desenvolver suas funcionalidades de acordo com os princípios estabelecidos pela legislação brasileira, especialmente:' },
      { lista: [
        'Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD);',
        'Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente (ECA);',
        'Lei nº 15.211/2025 — Estatuto Digital da Criança e do Adolescente (ECA Digital).'
      ] },
      { p: 'A LGPD estabelece que o tratamento de dados pessoais de crianças deve ocorrer considerando seu melhor interesse, com proteção especial e transparência.' },
      { p: 'O ECA Digital reforça a importância de ambientes digitais seguros, da proteção da privacidade e da supervisão dos responsáveis.' },
      { p: 'A Petalplay reconhece a importância dessas disposições e busca incorporá-las ao desenvolvimento do Vale das Frutas.' }
    ]
  },
  {
    titulo: '10. Atualizações desta Política',
    blocos: [
      { p: 'Esta Política de Privacidade poderá ser atualizada para acompanhar mudanças nas funcionalidades do Vale das Frutas, na tecnologia utilizada ou na legislação aplicável.' },
      { p: 'Caso ocorram alterações relevantes na forma como os dados pessoais são utilizados, os responsáveis serão informados previamente.' },
      { p: 'Quando uma alteração exigir novo consentimento, ele será solicitado antes do início do novo tratamento.' },
      { p: 'A utilização do aplicativo não será considerada, por si só, autorização para novas finalidades que exijam consentimento específico.' }
    ]
  },
  {
    titulo: '11. Nosso compromisso',
    blocos: [
      { p: 'O Vale das Frutas nasceu com o propósito de transformar a educação alimentar em uma experiência divertida e positiva para as crianças.' },
      { p: 'Acreditamos que a tecnologia deve contribuir para o desenvolvimento infantil sem deixar de lado a segurança, a privacidade e o respeito.' },
      { p: 'Por isso, assumimos o compromisso de tratar as informações pessoais com responsabilidade, transparência e cuidado, priorizando sempre o melhor interesse das crianças.' }
    ]
  }
];

function MostrarBloco({ bloco }: { bloco: Bloco }) {
  if ('sub' in bloco) return <p className="sub">{bloco.sub}</p>;
  if ('lista' in bloco) return <ul>{bloco.lista.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <p>{bloco.p}</p>;
}

export default function Termos() {
  usePagina('Política de Privacidade', 'home-page', '#6fa981');

  return (
    <>
      <BarraTopo titulo="Política de Privacidade" voltarPara="/home" />

      <div className="child-body termos-doc">
        <h1 className="termos-doc-titulo">Política de Privacidade e Proteção de Dados</h1>
        {SECOES.map((s) => (
          <section key={s.titulo}>
            <p className="tit">{s.titulo}</p>
            {s.blocos.map((b, i) => <MostrarBloco key={i} bloco={b} />)}
          </section>
        ))}
      </div>
    </>
  );
}
