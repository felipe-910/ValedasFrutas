import BarraTopo from '../components/BarraTopo';
import { usePagina } from '../lib/usePagina';

const INTRODUCAO = 'Estes Termos de Uso ("Termos") regem o acesso e a utilização do aplicativo Vale das Frutas ("Aplicativo", "nós"), destinado ao acompanhamento de alimentação, metas e desempenho de crianças ("pequenos"), sob responsabilidade de seus pais, mães ou responsáveis legais ("Responsável", "você"). Ao criar uma conta ou utilizar o Aplicativo, você declara ter lido, compreendido e aceitado integralmente estes Termos. Caso não concorde com qualquer disposição aqui prevista, você não deverá utilizar o Aplicativo.';

const SECOES: Array<{ titulo: string; texto: string }> = [
  { titulo: '1. Aceitação dos Termos', texto: 'O uso do Aplicativo é condicionado à aceitação expressa destes Termos. A aceitação ocorre no momento do cadastro e é indispensável para a criação e manutenção da conta.' },
  { titulo: '2. Elegibilidade e responsabilidade parental', texto: 'O Aplicativo destina-se exclusivamente a usuários maiores de 18 (dezoito) anos, na condição de pai, mãe ou responsável legal pela criança cujos dados venham a ser cadastrados. Ao inserir informações sobre um pequeno, você declara possuir autoridade legal para fazê-lo e assume integral responsabilidade pela veracidade, atualização e adequação de tais informações.' },
  { titulo: '3. Cadastro e segurança da conta', texto: 'Você é o único responsável pela guarda e confidencialidade de suas credenciais de acesso, bem como por todas as atividades realizadas em sua conta. Comunique-nos imediatamente em caso de suspeita de uso não autorizado. O Aplicativo poderá suspender ou encerrar contas que apresentem informações falsas, incompletas ou uso indevido.' },
  { titulo: '4. Coleta e uso de dados', texto: 'Para o funcionamento do Aplicativo, coletamos dados da conta do Responsável (como nome e email) e dados inseridos sobre os pequenos (como nome, idade, metas, refeições registradas e desempenho). Esses dados são tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e utilizados exclusivamente para viabilizar as funcionalidades do Aplicativo, sendo visíveis apenas ao Responsável que os cadastrou.' },
  { titulo: '5. Privacidade e compartilhamento', texto: 'Não compartilhamos, vendemos ou cedemos os dados cadastrados a terceiros para fins comerciais. Os dados poderão ser processados por prestadores de infraestrutura (como serviços de autenticação e armazenamento em nuvem) estritamente para operação do Aplicativo. Você pode solicitar a exclusão de sua conta e dos dados associados a qualquer momento pela tela de perfil.' },
  { titulo: '6. Natureza do serviço', texto: 'O Aplicativo é uma ferramenta de apoio ao acompanhamento de hábitos alimentares e metas infantis, não constituindo aconselhamento médico, nutricional ou psicológico. Recomendações relacionadas à saúde ou alimentação da criança devem ser sempre avaliadas por profissional qualificado.' },
  { titulo: '7. Propriedade intelectual', texto: 'Todos os direitos sobre o Aplicativo, incluindo marca, layout, textos, ilustrações e código-fonte, pertencem aos seus desenvolvedores, sendo vedada a reprodução, distribuição ou engenharia reversa sem autorização prévia.' },
  { titulo: '8. Limitação de responsabilidade', texto: 'O Aplicativo é fornecido "no estado em que se encontra". Envidamos esforços razoáveis para manter sua disponibilidade e precisão, mas não garantimos operação ininterrupta ou isenta de falhas, e não nos responsabilizamos por decisões tomadas exclusivamente com base nas informações registradas no Aplicativo.' },
  { titulo: '9. Cancelamento e encerramento', texto: 'Você pode encerrar sua conta a qualquer momento. Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos ou a legislação aplicável, mediante notificação quando possível.' },
  { titulo: '10. Alterações destes Termos', texto: 'Estes Termos podem ser atualizados periodicamente para refletir mudanças no Aplicativo ou na legislação. Alterações relevantes serão comunicadas dentro do Aplicativo, e a continuidade do uso após a atualização implica concordância com os novos Termos.' },
  { titulo: '11. Legislação aplicável', texto: 'Estes Termos são regidos pelas leis da República Federativa do Brasil, sendo eleito o foro do domicílio do Responsável para dirimir eventuais controvérsias, salvo disposição legal em contrário.' },
  { titulo: '12. Contato', texto: 'Dúvidas, solicitações ou pedidos relacionados a estes Termos ou aos dados cadastrados podem ser encaminhados pelos canais de suporte disponibilizados no Aplicativo.' }
];

export default function Termos() {
  usePagina('Termos de Uso', 'home-page', '#6fa981');

  return (
    <>
      <BarraTopo titulo="Termos de Uso" voltarPara="/home" />

      <div className="child-body termos-doc">
        <p>{INTRODUCAO}</p>
        {SECOES.map((s) => (
          <div key={s.titulo}>
            <p className="tit">{s.titulo}</p>
            <p>{s.texto}</p>
          </div>
        ))}
      </div>
    </>
  );
}
