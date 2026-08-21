import { Code2, ExternalLink, FileCheck2, Instagram, Mail, ShieldCheck, Sprout } from "lucide-react";

export type ProfileInformationKind = "terms" | "privacy" | "credits" | "about";

const information = {
  terms: {
    eyebrow: "DOCUMENTO OFICIAL",
    title: "Termos de uso",
    icon: <FileCheck2 size={28} />,
    introduction: "Estes termos explicam como utilizar o Hydra Agro com responsabilidade e quais recursos dependem de serviços ou equipamentos externos.",
    sections: [
      ["1. Finalidade da plataforma", "O Hydra Agro auxilia na organização de dados da propriedade, água, rebanho, atividades, setores, comunidade, NFC/RFID e monitoramento. Ele não substitui orientação veterinária, agronômica, ambiental, jurídica ou de segurança."],
      ["2. Responsabilidade pelos registros", "O usuário deve informar dados verdadeiros, manter suas credenciais protegidas e revisar as informações antes de salvar. Decisões sobre manejo, consumo e operação da propriedade continuam sendo responsabilidade do produtor."],
      ["3. Recursos conectados", "Leitura NFC/RFID, clima, notificações externas e pagamentos dependem de aparelho, internet, permissões ou integração compatível. O aplicativo não confirma uma operação que não aconteceu."],
      ["4. Comunidade", "É proibido publicar conteúdo ilegal, ofensivo, enganoso ou que viole direitos de terceiros. Conteúdos podem ser moderados e contas podem ser restringidas quando houver abuso comprovado."],
      ["5. Disponibilidade e evolução", "O projeto pode receber melhorias, correções e períodos de manutenção. Sempre que possível, dados já sincronizados permanecem vinculados à conta do usuário."],
    ],
  },
  privacy: {
    eyebrow: "SEUS DADOS",
    title: "Política de privacidade",
    icon: <ShieldCheck size={28} />,
    introduction: "A privacidade foi organizada para que cada conta veja apenas os próprios dados rurais, salvo conteúdos públicos da comunidade e acessos administrativos autorizados pelo servidor.",
    sections: [
      ["Dados tratados", "Podem ser armazenados nome, e-mail, telefone, foto, dados da propriedade, animais, registros de água, atividades, setores, monitoramentos, publicações e preferências."],
      ["Finalidade", "Os dados são usados para autenticar a conta, manter a ficha da propriedade, calcular indicadores reais, sincronizar registros, exibir alertas e permitir as funções escolhidas pelo usuário."],
      ["Isolamento e segurança", "Registros privados são vinculados ao identificador da conta e protegidos pelas regras de acesso do Supabase. Cargos administrativos são validados no servidor, nunca apenas na interface."],
      ["Clima e serviços externos", "Para consultar o clima, o aplicativo envia somente o nome da cidade e suas coordenadas aproximadas ao serviço meteorológico. E-mail, senha, animais e demais registros rurais não fazem parte dessa consulta."],
      ["Direitos do usuário", "O titular pode solicitar acesso, correção ou exclusão de dados pelos canais oficiais. Algumas informações poderão ser preservadas quando houver obrigação legal ou necessidade de segurança."],
    ],
  },
  credits: {
    eyebrow: "CRÉDITOS DO PROJETO",
    title: "Créditos",
    icon: <Code2 size={28} />,
    introduction: "O Hydra Agro é um projeto independente de tecnologia rural, desenvolvido para reunir gestão da propriedade, sustentabilidade e identificação de animais em uma experiência simples.",
    sections: [
      ["Produto e desenvolvimento", "Concepção, interface e desenvolvimento do Hydra Agro são mantidos de forma independente, com evolução contínua a partir dos testes reais do aplicativo."],
      ["Tecnologias", "A aplicação utiliza React e TypeScript na interface, Supabase para autenticação e dados e Capacitor para integração com recursos do aplicativo móvel."],
      ["Identificação animal", "A área de identificação foi construída para trabalhar com NFC/RFID e links públicos de animais quando o aparelho e o ambiente oferecem suporte compatível."],
      ["Princípio do projeto", "Indicadores, leituras, consumo e resultados só devem aparecer quando existirem registros reais. O aplicativo evita preencher métricas com dados inventados."],
    ],
  },
  about: {
    eyebrow: "TECNOLOGIA RURAL",
    title: "Sobre o Hydra Agro",
    icon: <Sprout size={28} />,
    introduction: "O Hydra Agro é uma plataforma regional de tecnologia para o agronegócio, criada para aproximar gestão, sustentabilidade e inovação da rotina do produtor.",
    sections: [
      ["O que o aplicativo reúne", "Gestão hídrica, rebanho, identificação NFC/RFID, atividades, setores da propriedade, comunidade e monitoramento."],
      ["Atuação inicial", "O lançamento regional atende Brejões e municípios vizinhos na Bahia. A cidade cadastrada personaliza a propriedade e a consulta meteorológica."],
      ["Compromisso com dados reais", "O aplicativo mostra estados vazios quando não existem registros. Leituras NFC, economia de água e cobranças nunca são inventadas."],
      ["Desenvolvimento", "Produto independente em evolução contínua. Recursos que dependem de hardware, API ou pagamento somente são liberados quando a integração correspondente está disponível."],
    ],
  },
} as const;

export function ProfileInformation({ kind, onClose, onEmail, onInstagram }: { kind: ProfileInformationKind; onClose: () => void; onEmail: () => void; onInstagram: () => void }) {
  const content = information[kind];
  return (
    <div className="profile-information">
      <header className="legal-intro">
        <span>{content.icon}</span>
        <div><small>{content.eyebrow}</small><p>{content.introduction}</p></div>
      </header>
      <div className="legal-sections">
        {content.sections.map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
      </div>
      <div className="legal-meta"><strong>Hydra Agro · versão 1.2.2</strong><span>Última atualização: 21 de agosto de 2026</span></div>
      <div className="legal-contact-actions">
        <button className="secondary-button" onClick={onEmail}><Mail size={18} /> Suporte</button>
        <button className="secondary-button" onClick={onInstagram}><Instagram size={18} /> Instagram <ExternalLink size={14} /></button>
      </div>
      <button className="primary-button full" onClick={onClose}>Entendi e fechar</button>
    </div>
  );
}