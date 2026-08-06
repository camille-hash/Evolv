import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | EVOLV",
  description:
    "Saiba como a Patrion Asset Ltda., responsável pelo EVOLV, trata e protege dados pessoais.",
};

const privacyEmail = "camille@temperlandia.com.br";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-card/70">
        <div className="mx-auto flex w-full max-w-4xl items-center px-5 py-5 sm:px-8">
          <span className="text-sm font-semibold tracking-[0.16em] text-brand-forest">
            EVOLV
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <article>
          <header className="border-b border-border pb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gold">
              Privacidade e proteção de dados
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl">
              Política de Privacidade
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Esta Política de Privacidade descreve como a Patrion Asset Ltda.,
              inscrita no CNPJ sob o nº 63.836.794/0001-48, responsável pelo
              EVOLV, realiza o tratamento de dados pessoais.
            </p>
          </header>

          <div className="space-y-10 py-10 text-[1rem] leading-8 text-foreground/85 sm:py-12">
            <PolicySection title="1. Objetivo desta política">
              <p>
                Esta política informa, de forma transparente, como os dados
                pessoais são coletados, utilizados, armazenados, protegidos e,
                quando necessário, compartilhados no contexto do EVOLV.
              </p>
            </PolicySection>

            <PolicySection title="2. Dados pessoais tratados">
              <p>
                Conforme o formulário e a interação realizada, podemos tratar:
              </p>
              <PolicyList
                items={[
                  "nome;",
                  "telefone;",
                  "endereço de e-mail;",
                  "respostas fornecidas voluntariamente em formulários;",
                  "informações de origem do cadastro, como campanha, conjunto de anúncios, anúncio e formulário;",
                  "registros técnicos e operacionais necessários ao funcionamento, à segurança e à rastreabilidade do serviço.",
                ]}
              />
            </PolicySection>

            <PolicySection title="3. Origem dos dados">
              <p>
                Os dados podem ser fornecidos diretamente pelo titular ou
                recebidos por meio de formulários de anúncios disponibilizados
                em plataformas da Meta, como Facebook e Instagram, quando o
                titular decide enviar o cadastro.
              </p>
            </PolicySection>

            <PolicySection title="4. Finalidades do tratamento">
              <p>Os dados pessoais podem ser tratados para:</p>
              <PolicyList
                items={[
                  "atender solicitações de contato;",
                  "realizar atendimento comercial;",
                  "compreender o interesse manifestado;",
                  "organizar e acompanhar oportunidades no CRM;",
                  "manter o histórico e a rastreabilidade do atendimento;",
                  "prevenir fraudes, abusos e incidentes;",
                  "cumprir obrigações legais e regulatórias;",
                  "proteger direitos da Patrion Asset Ltda. e dos titulares.",
                ]}
              />
            </PolicySection>

            <PolicySection title="5. Bases legais">
              <p>
                Conforme cada operação e as circunstâncias aplicáveis, o
                tratamento poderá estar fundamentado em:
              </p>
              <PolicyList
                items={[
                  "consentimento;",
                  "execução de procedimentos preliminares relacionados a contrato;",
                  "cumprimento de obrigação legal ou regulatória;",
                  "exercício regular de direitos;",
                  "legítimo interesse, após avaliação dos direitos e das expectativas do titular.",
                ]}
              />
            </PolicySection>

            <PolicySection title="6. Compartilhamento">
              <p>
                Os dados podem ser tratados por fornecedores estritamente
                necessários à operação, como serviços de hospedagem,
                infraestrutura, banco de dados, comunicação e plataformas
                tecnológicas. O recebimento de cadastros originados de anúncios
                pode envolver os serviços da Meta.
              </p>
              <p className="mt-4">
                A Patrion Asset Ltda. não comercializa dados pessoais.
              </p>
            </PolicySection>

            <PolicySection title="7. Armazenamento e segurança">
              <p>
                Adotamos medidas técnicas e administrativas razoáveis para
                proteger os dados contra acesso não autorizado, perda,
                alteração, divulgação ou destruição indevida. Nenhum ambiente,
                contudo, pode ser considerado absolutamente imune a riscos.
              </p>
            </PolicySection>

            <PolicySection title="8. Retenção e exclusão">
              <p>
                Os dados são mantidos somente pelo período necessário para as
                finalidades descritas, para o cumprimento de obrigações legais,
                a resolução de disputas, o exercício regular de direitos e a
                preservação de registros legítimos. Após esse período, poderão
                ser eliminados ou anonimizados, observadas as hipóteses legais
                de conservação.
              </p>
            </PolicySection>

            <PolicySection title="9. Direitos do titular">
              <p>Nos termos aplicáveis, o titular pode solicitar:</p>
              <PolicyList
                items={[
                  "confirmação da existência do tratamento;",
                  "acesso aos dados;",
                  "correção de dados incompletos, inexatos ou desatualizados;",
                  "anonimização, bloqueio ou eliminação;",
                  "portabilidade, quando regulamentada e aplicável;",
                  "informações sobre compartilhamento;",
                  "revogação do consentimento;",
                  "oposição ao tratamento;",
                  "revisão de decisões automatizadas, quando aplicável;",
                  "apresentação de reclamação à Autoridade Nacional de Proteção de Dados.",
                ]}
              />
              <p className="mt-4">
                Alguns pedidos podem não ser atendidos integralmente quando
                houver obrigação legal ou outra hipótese legítima de
                conservação dos dados.
              </p>
            </PolicySection>

            <PolicySection title="10. Solicitações de privacidade">
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre
                privacidade, envie uma mensagem para{" "}
                <a
                  className="font-medium text-brand-forest underline decoration-brand-gold underline-offset-4 hover:text-brand-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-forest"
                  href={`mailto:${privacyEmail}`}
                >
                  {privacyEmail}
                </a>
                . Para proteger os próprios dados, poderá ser necessária a
                confirmação da identidade do solicitante.
              </p>
            </PolicySection>

            <PolicySection title="11. Transferências internacionais">
              <p>
                Alguns fornecedores tecnológicos podem processar ou armazenar
                informações fora do Brasil. Quando aplicável, são adotadas
                medidas compatíveis com a Lei Geral de Proteção de Dados
                Pessoais para a proteção dessas informações.
              </p>
            </PolicySection>

            <PolicySection title="12. Alterações desta política">
              <p>
                Esta política pode ser atualizada para refletir mudanças legais,
                operacionais ou tecnológicas. A versão vigente estará publicada
                nesta mesma página, acompanhada da respectiva data de
                atualização.
              </p>
            </PolicySection>

            <PolicySection title="13. Contato do controlador">
              <address className="not-italic">
                <p>Patrion Asset Ltda.</p>
                <p>CNPJ: 63.836.794/0001-48</p>
                <p>
                  E-mail:{" "}
                  <a
                    className="font-medium text-brand-forest underline decoration-brand-gold underline-offset-4 hover:text-brand-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-forest"
                    href={`mailto:${privacyEmail}`}
                  >
                    {privacyEmail}
                  </a>
                </p>
              </address>
            </PolicySection>
          </div>
        </article>
      </main>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-5 py-7 text-sm text-muted-foreground sm:px-8">
          <p>Última atualização: 6 de agosto de 2026.</p>
          <p>© 2026 Patrion Asset Ltda. — EVOLV.</p>
        </div>
      </footer>
    </div>
  );
}

function PolicySection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section aria-labelledby={toSectionId(title)}>
      <h2
        className="text-xl font-semibold tracking-tight text-brand-ink sm:text-2xl"
        id={toSectionId(title)}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-brand-gold">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function toSectionId(title: string) {
  return `secao-${title.split(".")[0]}`;
}
