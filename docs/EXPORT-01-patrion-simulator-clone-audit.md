# PATRION SIMULATOR — Clone Audit

## 1. Resumo Executivo

Esta auditoria foi executada em `C:\Projetos\Evolv-Auth`, na branch `patrion-simulator-delivery`, com o `origin` apontando para `https://github.com/camille-hash/Evolv.git`.

O Patrion Simulator pode ser entregue como aplicação independente sem CRM, Supabase, Auth ou RLS. Os dois motores de cálculo são funções locais e determinísticas. A persistência útil ao simulador já é feita no navegador por `localStorage`; ela pode ser mantida como conveniência ou substituída por estado React sem alterar os cálculos.

A extração não deve copiar `app/page.tsx` nem o shell de navegação atual. Esses arquivos concentram login, permissões, CRM e várias áreas fora do escopo. A estratégia recomendada é criar uma Home mínima com duas entradas e clonar apenas os domínios de Simulação Comercial, Multi-Cotas e relatórios.

Há duas implementações de apresentação comercial no EVOLV:

- `components/presentation/client-presentation-page.tsx`: experiência comercial sem CRM, mas dependente de uma `Operation` previamente persistida;
- `components/simulator/simulator-panel.tsx`: contém formulário, resultado, PDF e configurações, mas também agrega inteligência patrimonial, estratégias, operações e integração opcional com lead.

Para o produto final, o melhor ponto de partida funcional é extrair do `SimulatorPanel` o formulário e o resultado para componentes menores, reutilizando diretamente o motor. Copiar o arquivo inteiro manteria dependências que não pertencem ao Patrion Simulator.

Respostas objetivas:

- **A Simulação Comercial pode funcionar sem CRM?** Sim. O cálculo, a apresentação e o PDF não consultam CRM nem Supabase. A integração de lead é uma borda opcional da UI atual.
- **O Multi-Cotas pode funcionar sem CRM?** Sim. Formulário, cálculo e resultado funcionam com estado React e `localStorage`.
- **O PDF Comercial pode ser gerado apenas a partir do resultado da simulação?** Sim. O input obrigatório é `SimulatorCommercialPresentation`; nome, dados comerciais, inteligência, jornada e data são opcionais.
- **O PDF Multi-Cotas pode ser gerado apenas a partir do resultado Multi-Cotas atual?** Conceitualmente, sim; no código atual, ainda não diretamente. O gerador exige um envelope `snapshot` e metadados de lead, e só é acionado no dossiê. É necessária uma adaptação pequena de contrato para receber `MultiCotasInput` + `MultiCotasResult` atuais e metadados comerciais opcionais.

## 2. Arquivos Necessários

### 2.1 Simulação Comercial

| Papel | Arquivo atual | Decisão de clonagem |
|---|---|---|
| UI principal com formulário e resultados | `components/simulator/simulator-panel.tsx` | **Extrair seletivamente.** Não copiar inteiro; separar formulário, resultado e controles comerciais das integrações laterais. |
| UI comercial alternativa | `components/presentation/client-presentation-page.tsx` | **Referência útil**, especialmente para a apresentação ao vivo; remover a exigência de `Operation` ativa se for reutilizada. |
| Workspace de operações | `components/simulator/simulation-workspace.tsx` | **Não necessário** no escopo mínimo; organiza múltiplas operações locais, área técnica e administradoras. |
| Motor base | `modules/simulator/engine.ts` | **Copiar.** Calcula os três cenários e valida entradas fundamentais. |
| Apresentação comercial | `modules/simulator/presentation.ts` | **Copiar.** Calcula INCC, crédito atualizado/líquido, lance, parcelas, investimento, venda e alavancagem. |
| Tipos e exports | `modules/simulator/index.ts` | **Recriar com exports mínimos** para não carregar módulos fora do escopo. |
| Tipos persistidos | Parte tipada de `modules/simulator/storage.ts` | **Extrair tipos necessários** (`SimulatorSavedFormState`, `SimulatorCommercialData` e snapshots). |
| Persistência de simulações | `modules/simulator/storage.ts` | **Opcional/substituível.** Manter se o produto precisar de histórico local; caso contrário, usar estado React. |
| Administradoras | `modules/simulator/administrators.ts` | **Opcional.** Necessário somente se seleção e parâmetros por administradora fizerem parte do formulário final. |
| Propostas ancoradas | `modules/simulator/anchoring.ts` | **Opcional.** Não é requisito expresso do produto-alvo. |
| Validação de exemplo | `modules/simulator/validation.ts` | **Recomendado para testes**, não é dependência de runtime da operação principal. |
| Tipos legados | `types/simulator.ts` | **Não necessário** para a cadeia comercial atual; é apenas reexportado pelo barrel. |

Fluxo autônomo recomendado:

1. Formulário produz `SimulatorInput` e as escolhas comerciais.
2. `calculateSimulatorScenarios(input)` produz os cenários.
3. `buildSimulatorCommercialPresentation(...)` produz o resultado exibível e exportável.
4. O resultado permanece em estado React; histórico local é opcional.
5. `generateSimulatorCommercialPdf(...)` recebe a apresentação atual.

Validações existentes:

- crédito maior que zero;
- taxas administrativa, fundo de reserva e seguro não negativas;
- prazo inteiro e maior que zero;
- mês de contemplação limitado ao prazo;
- parsers e normalização numérica na UI;
- teste de referência em `modules/simulator/validation.ts`.

Dependências externas de runtime: React, Next.js, `lucide-react`, Tailwind CSS e `jspdf`. `class-variance-authority`, `@radix-ui/react-slot`, `clsx` e `tailwind-merge` são necessários apenas se o botão e o helper compartilhados forem clonados sem simplificação.

Dependências a remover/substituir por props ou estado local:

- `CrmLeadProposalContext`, `addCrmLeadSimulation` e `loadCrmLeadSimulations` de `@/modules/crm`;
- leitura de token Supabase e `fetch("/api/crm/lead-simulations")`;
- botão e estados de “Salvar simulação no lead”;
- hidratação de crédito a partir de `leadDesiredCredit` — substituir por valor inicial opcional do formulário;
- vínculo do PDF/proposta ao dossiê — chamar o PDF diretamente com o resultado atual;
- `client-context`, portfólio, inteligência de portfólio, recomendações, riqueza, estratégias e operações, salvo se algum deles for aprovado como extensão futura.

### 2.2 Multi-Cotas

| Papel | Arquivo atual | Decisão de clonagem |
|---|---|---|
| Formulário e resultado | `components/multi-cotas/multi-cotas-page.tsx` | **Copiar e desacoplar.** A maior parte já é autônoma. Remover apenas o bloco de contexto/salvamento em lead e adicionar o botão de PDF local. |
| Motor | `modules/multi-cotas/multi-cotas-engine.ts` | **Copiar integralmente.** |
| Tipos | `modules/multi-cotas/multi-cotas-types.ts` | **Copiar integralmente.** |
| Persistência local | `modules/multi-cotas/multi-cotas-storage.ts` | **Opcional/recomendado.** Não depende de CRM; usa `localStorage`. |
| Exports | `modules/multi-cotas/index.ts` | **Copiar ou recriar** com os mesmos exports do domínio. |

O motor normaliza entre 2 e 30 cartas, limita meses ao prazo, impede valores/taxas negativos, calcula reajustes anuais de INCC, valorização mensal em espera e consolida os totais. Não há consulta externa.

Dependências a remover/substituir por props ou estado local:

- tipo `CrmLeadProposalContext`;
- bloco visual “salvar apenas para este lead”;
- `studyTitle` condicionado ao nome do lead — manter como título local livre;
- `readSupabaseAccessToken()` e cliente Supabase criado dentro da página;
- POST para `/api/crm/lead-simulations` e respectivo payload;
- `leadId`, `leadContext` e `source: "lead_detail"`;
- `sessionStorage` usado indiretamente por `crm-lead-proposal-context.ts` — não clonar esse módulo.

### 2.3 PDF Comercial

Arquivo gerador: `modules/reports/commercial-pdf.ts`  
Função exportada: `generateSimulatorCommercialPdf`  
Barrel atual: `modules/reports/index.ts`

Contrato atual:

- obrigatório: `presentation: SimulatorCommercialPresentation`;
- opcionais: `simulationName`, `commercialData`, `intelligenceSummary`, `wealthJourney`, `simulationDate`.

O gerador não recebe lead, snapshot de CRM, sessão ou cliente Supabase. Ele usa `jsPDF`, formatadores `Intl.NumberFormat("pt-BR")`, data local, fontes internas Helvetica e desenho vetorial. Não há imagens, logos binários ou outros assets externos.

INCC é lido da apresentação (`inccRate`, `inccAdjustmentCount`, `updatedCredit`) e exibido no relatório. A moeda é formatada como BRL. O disclaimer final está embutido no arquivo e deve ser preservado na clonagem.

Para o escopo mínimo, `intelligenceSummary` e `wealthJourney` podem ser omitidos. Se os painéis correspondentes forem excluídos, seus imports de tipos também devem ser substituídos por tipos locais mínimos ou seções opcionais do relatório.

### 2.4 PDF Multi-Cotas

Arquivo gerador: `modules/reports/multi-cotas-pdf.ts`  
Função exportada: `generateMultiCotasCommercialPdf`  
Ponto de uso atual: `components/crm/crm-lead-detail.tsx`

Contrato atual:

- `leadName`;
- `simulationCreatedAt`;
- `simulationTitle`;
- `snapshot: Record<string, unknown>` com `input`, `metadata` e `result`;
- `snapshot.result.summary` e `snapshot.result.cards` são obrigatórios na prática.

O PDF em si não consulta CRM nem Supabase, mas seu contrato foi modelado para um snapshot salvo em `crm_lead_simulations`. Por isso, hoje ele é gerado apenas dentro do dossiê do lead e não aparece em `MultiCotasPage`.

Adaptação recomendada para a próxima sprint:

```ts
type MultiCotasPdfInput = {
  input: MultiCotasInput;
  result: MultiCotasResult;
  title?: string;
  clientName?: string;
  simulationDate?: string;
};
```

Essa alteração elimina `SnapshotRecord`, torna o nome do cliente opcional e permite gerar o documento diretamente do resultado atual. Também oferece tipagem de ponta a ponta, em vez das leituras defensivas atuais de `Record<string, unknown>`.

O gerador usa somente `jsPDF`, Helvetica interna e elementos vetoriais; não há assets externos. Formata moeda em BRL, percentuais em `pt-BR`, mostra o INCC vindo de `input.annualInccPercent`/metadata e inclui uma página própria de disclaimer. O disclaimer deve ser preservado.

### 2.5 UI Compartilhada / Helpers

Arquivos mínimos ou referências:

- `app/globals.css`: tokens visuais, Tailwind e classes `executive-surface`/`executive-hero`;
- `components/ui/button.tsx`: botão compartilhado; pode ser copiado com suas dependências ou substituído por um botão local simples;
- `lib/utils.ts`: helper `cn`, necessário para classes condicionais;
- `app/layout.tsx`: usar apenas como referência; o layout final não deve clonar `AppShell`, pois ele pertence ao sistema de acesso do EVOLV;
- `package.json`: referência de dependências somente. Não foi alterado nesta auditoria.

Não copiar:

- `app/page.tsx` atual;
- `components/layout/app-sidebar.tsx`, `components/layout/app-shell.tsx` e demais navegações do EVOLV;
- `components/crm/**`, `modules/crm/**`, `app/api/crm/**`;
- componentes de dossiê, timeline, tasks, Meu Dia e Check Points;
- módulos de Auth/Supabase e migrations/SQL.

## 3. Dependências Encontradas

| Dependência | Onde aparece na cadeia atual | Classificação para o produto final | Tratamento |
|---|---|---|---|
| React / React DOM | Todas as telas | **Obrigatória** | Manter. |
| Next.js | Rotas e build | **Obrigatória** no desenho proposto | Manter com App Router mínimo. |
| Tailwind CSS | Toda a UI | **Obrigatória** se o visual atual for preservado | Manter tokens e classes relevantes. |
| `jspdf` | Ambos os PDFs | **Obrigatória** | Manter. |
| `lucide-react` | Ícones das telas | **Substituível** | Manter ou trocar por ícones simples. |
| `@radix-ui/react-slot` + `class-variance-authority` | `Button` compartilhado | **Substituível** | Só manter se o componente for copiado. |
| `clsx` + `tailwind-merge` | `cn` | **Substituível** | Manter ou simplificar classes. |
| `localStorage` | Simulações, administradoras, operações e Multi-Cotas | **Substituível** | Usar apenas para persistência local opcional. |
| `sessionStorage` | Contexto de lead | **Removível** | Não clonar. |
| módulos de inteligência/wealth | Painel e seções opcionais do PDF comercial | **Removível** | Excluir do MVP ou manter atrás de props opcionais. |
| módulos de operações | Apresentação comercial alternativa | **Substituível** | Trocar por estado local de uma simulação atual. |
| Supabase JS | Auth e salvamento em lead | **Removível** | Não incluir no produto final. |

## 4. Dependências CRM a Remover/Substituir

| Dependência proibida | Ocorrência relevante | Classificação | Ação recomendada |
|---|---|---|---|
| `crm_leads` | resolução/validação de lead no serviço e dossiê | **Removível** | Não copiar serviços, API nem dossiê. |
| `crm_lead_simulations` | salvar simulação/Multi-Cotas e recuperar snapshot para PDF | **Substituível** | Estado React + `localStorage`; PDF recebe resultado atual tipado. |
| `crm_tasks` | fora dos motores e PDFs | **Removível** | Excluir integralmente. |
| `crm_lead_notes` | fora dos motores e PDFs | **Removível** | Excluir integralmente. |
| timeline | eventos derivados das simulações salvas | **Removível** | Excluir integralmente. |
| dossiê | origem do contexto e único acionador atual do PDF Multi-Cotas | **Substituível** | Home/formulário local e botão de PDF no resultado. |
| Meu Dia | consumidor de histórico CRM | **Removível** | Excluir integralmente. |
| Check Points | fora da cadeia de cálculo | **Removível** | Excluir integralmente. |
| Supabase obrigatório | token e POST de salvamento | **Removível** | Retirar SDK, variáveis e chamadas da cadeia do simulador. |
| RLS | protege tabelas CRM | **Removível** | Sem banco remoto, não pertence ao produto. |
| Auth obrigatório | shell atual bloqueia `app/page.tsx` | **Removível** | Criar Home pública/local mínima. |
| `CrmLeadProposalContext` | props das duas telas e hidratação de dados | **Substituível** | Props neutras opcionais (`initialCredit`, `clientName`, `title`) ou estado local. |

Nenhuma dependência CRM é obrigatória para os cálculos ou para a renderização dos PDFs.

## 5. Estrutura Recomendada do Patrion Simulator

```text
patrion-simulator/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── simulacao-comercial/
│   │   └── page.tsx
│   └── multi-cotas/
│       └── page.tsx
├── components/
│   ├── home/
│   │   └── simulator-home.tsx
│   ├── commercial-simulation/
│   │   ├── commercial-simulation-form.tsx
│   │   └── commercial-simulation-result.tsx
│   ├── multi-cotas/
│   │   ├── multi-cotas-form.tsx
│   │   └── multi-cotas-result.tsx
│   └── ui/
│       └── button.tsx
├── modules/
│   ├── commercial-simulation/
│   │   ├── engine.ts
│   │   ├── presentation.ts
│   │   ├── types.ts
│   │   └── storage.ts
│   ├── multi-cotas/
│   │   ├── engine.ts
│   │   ├── types.ts
│   │   └── storage.ts
│   └── reports/
│       ├── commercial-pdf.ts
│       └── multi-cotas-pdf.ts
├── lib/
│   └── utils.ts
└── package.json
```

Princípios da estrutura:

- Home contém apenas os dois caminhos de produto;
- cada domínio possui contrato tipado e motor independente da UI;
- PDF recebe dados do domínio, não snapshots de infraestrutura;
- persistência local fica atrás de um arquivo próprio e pode ser removida sem tocar no motor;
- não há camada genérica de CRM, CMS, banco ou autenticação.

## 6. Complexidade Estimada

**Média.**

Justificativa:

- os motores e o PDF Comercial já são autônomos e reutilizáveis;
- a UI Multi-Cotas exige apenas remoção da borda CRM e inclusão do acionador de PDF;
- o PDF Multi-Cotas exige refatoração pequena, mas importante, de contrato e integração;
- a Simulação Comercial exige decompor um componente grande e escolher um único fluxo de estado, evitando carregar módulos de operações, inteligência, portfólio e CRM;
- a Home e o shell mínimos são simples, mas precisam preservar o visual e a responsividade sem importar o controle de acesso atual.

Estimativa relativa por frente:

| Frente | Complexidade |
|---|---|
| Home e rotas mínimas | Baixa |
| Engines e tipos | Baixa |
| UI Multi-Cotas autônoma | Baixa |
| PDF Comercial | Baixa |
| PDF Multi-Cotas direto do resultado | Média |
| Extração da UI de Simulação Comercial | Média |
| Remoção completa das dependências proibidas e testes | Média |

## 7. Riscos

1. **Copiar `SimulatorPanel` integralmente.** Isso levaria CRM, contexto de cliente, riqueza, portfólio, estratégias, operações e histórico para o produto novo.
2. **Usar `ClientPresentationPage` sem criar formulário autônomo.** A tela fica vazia sem uma `Operation` previamente persistida.
3. **Manter o contrato atual do PDF Multi-Cotas.** Isso perpetua a dependência conceitual de snapshot/lead mesmo sem Supabase.
4. **Duplicar fórmulas na UI ou no PDF.** Engines devem continuar como fonte única; PDFs devem apenas formatar resultados.
5. **Alterar percentuais sem respeitar unidades.** A Simulação Comercial usa taxas decimais (`0.06`), enquanto Multi-Cotas recebe pontos percentuais (`6`). O adaptador não pode misturar os contratos.
6. **Perder validações ao extrair a UI.** Normalizações de prazo, contemplação, número de cartas e valores não negativos devem acompanhar os motores.
7. **Clonar o shell autenticado.** `app/page.tsx` bloqueia a aplicação sem usuário e reintroduziria Auth obrigatório.
8. **Regressão de PDF.** Disclaimers, INCC, moeda BRL, quebra de páginas e nomes de arquivo precisam de testes específicos após a refatoração.
9. **Escopo acidental.** Administradoras, propostas ancoradas, inteligência e histórico local devem ser decisões explícitas; não entram automaticamente no MVP.
10. **Branding inconsistente.** O PDF Comercial usa “Patrion Asset” e “EVOLV”, enquanto o Multi-Cotas usa “EVOLV”. A próxima sprint deve definir o texto “Patrion Simulator” sem redesenhar os relatórios fora do escopo aprovado.

## 8. Próxima Sprint Recomendada

**EXPORT-02 — Scaffold e extração do Patrion Simulator independente.**

Escopo recomendado:

1. criar o novo app e as três rotas (`/`, `/simulacao-comercial`, `/multi-cotas`);
2. copiar os dois motores e seus tipos, preservando fórmulas;
3. decompor a Simulação Comercial em formulário e resultado com estado local;
4. desacoplar `MultiCotasPage` de `CrmLeadProposalContext`, token e API;
5. preservar o PDF Comercial com inputs opcionais mínimos;
6. tipar o PDF Multi-Cotas para `MultiCotasInput` + `MultiCotasResult` e acioná-lo na tela atual;
7. não instalar nem configurar Supabase/Auth;
8. validar com typecheck, lint, build, smoke test desktop/mobile e inspeção visual/conteudística dos dois PDFs;
9. confirmar por busca estática que o novo app não contém as dependências proibidas.

Critério de saída da próxima sprint: os dois simuladores e seus PDFs funcionam localmente a partir de dados informados pelo usuário, sem lead, CRM, dossiê, sessão, banco ou autenticação.
