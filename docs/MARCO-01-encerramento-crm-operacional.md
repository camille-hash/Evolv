# MARCO ARQUITETURAL

## EVOLV — Encerramento da Fase de CRM Operacional

### Resumo

Este documento registra oficialmente o encerramento da fase arquitetural denominada **CRM Operacional** no projeto EVOLV.

O marco reconhece a consolidação de uma base operacional capaz de identificar e organizar leads, preservar contexto comercial, executar tarefas, registrar histórico, vincular simulações, apresentar o trabalho diário e consolidar indicadores executivos derivados.

O encerramento não significa imutabilidade do sistema nem aprovação automática de novas frentes. Significa que os componentes fundamentais do ciclo operacional possuem fontes de verdade, responsabilidades e limites arquiteturais identificados.

A partir deste marco, o EVOLV possui base técnica para discutir uma futura transição de **CRM Operacional** para **CRM Gerencial e Inteligência Comercial**. Essa transição é apenas uma direção arquitetural possível. Ela não está autorizada por este documento.

### Componentes Consolidados

#### Infraestrutura

A infraestrutura consolidada estabelece:

- Supabase Auth como mecanismo oficial de autenticação;
- `organizations` e `organization_id` como padrão de isolamento organizacional;
- `profiles.id = auth.users.id` como vínculo oficial entre identidade e perfil operacional;
- roles operacionais iniciais `admin` e `sdr`;
- acesso server-side autenticado às fontes CRM;
- RLS e policies como fronteira de isolamento dos dados operacionais;
- repositories e services como camadas de acesso, sem uso de `service_role` no navegador;
- migrations históricas preservadas como registros imutáveis, com mudanças de banco tratadas de forma aditiva e controlada.

Essa fundação separa identidade, organização, autorização e dados comerciais, reduzindo dependências de estado exclusivamente local para o CRM oficial.

#### CRM Core

O CRM Core consolida o lead como entidade central da operação comercial.

O conjunto operacional inclui:

- base de leads em `crm_leads`;
- pipelines e etapas comerciais;
- status e temperatura manual do lead;
- responsável, origem, produto de interesse e valor pretendido;
- busca rápida por nome;
- filtros comerciais e históricos;
- movimentação entre etapas;
- consulta geral da base;
- separação visual das rotinas de prospecção, vendas, administrativo e perdas;
- acesso ao dossiê a partir dos contextos operacionais.

As classificações exibidas pelo CRM devem permanecer apoiadas em dados persistidos ou regras derivadas explicitamente documentadas. O CRM Core não estabelece score preditivo, probabilidade de fechamento ou recomendação automática.

#### Dossiê Executivo Vivo

O Dossiê Executivo Vivo consolida, por lead, o contexto necessário para compreender a relação comercial e agir sobre ela.

O dossiê organiza:

- identificação e contato;
- origem, responsável e objetivo comercial;
- contexto estratégico;
- pipeline, etapa, status e temperatura;
- última movimentação;
- próxima ação;
- notas persistidas;
- tarefas do lead;
- Timeline Operacional;
- Check Points derivados e explicáveis;
- histórico de Simulação Comercial;
- histórico de estudos Multi-Cotas;
- detalhes somente leitura de simulações e snapshots;
- acesso aos artefatos comerciais disponíveis.

O dossiê funciona como ponto de leitura e operação sobre fontes já existentes. Ele não deve criar uma segunda fonte de verdade para tarefas, notas, timeline ou simulações.

#### Timeline

A Timeline Operacional consolida uma leitura cronológica derivada dos registros operacionais do lead.

Sua arquitetura preserva o princípio:

```text
Notas lembram.
Tarefas executam.
Timeline audita.
```

A timeline reúne, conforme disponibilidade das fontes persistidas:

- nota criada;
- tarefa criada;
- tarefa concluída;
- tarefa cancelada;
- simulação comercial criada;
- estudo Multi-Cotas criado;
- eventos comerciais suportados pelo modelo vigente.

O read model é derivado server-side e somente leitura. As entidades originais permanecem como fontes de verdade. A timeline não constitui event store independente e não deve produzir evidência artificial para ações sem registro persistido confiável.

#### Gestão Operacional

A gestão operacional consolidada compreende:

- criação de tarefas comerciais;
- tarefa pendente como unidade de próxima ação;
- resolução determinística da próxima tarefa pendente;
- classificação temporal considerando data e horário;
- conclusão e cancelamento com rastreabilidade;
- tarefas vencidas, de hoje e futuras;
- aba Meu Dia como read model autenticado e derivado;
- Check Points calculados pela engine existente, sem persistência própria;
- foco operacional baseado em evidências explícitas;
- estados de carregamento, erro e ausência de dados sem criação de informação substituta.

Meu Dia não é agenda paralela e Check Points não são score. Ambos reutilizam tarefas, notas, simulações e eventos já existentes para apresentar o estado atual da operação.

#### Simulações

As simulações consolidam o vínculo entre atividade comercial e lead.

O estado arquitetural inclui:

- Simulação Comercial vinculada ao lead;
- estudos Multi-Cotas vinculados ao lead;
- persistência em `crm_lead_simulations`;
- distinção entre tipos `commercial` e `multi_cotas`;
- snapshots técnicos, de cálculo e de apresentação;
- histórico de simulações no dossiê;
- leitura detalhada sem recálculo do registro histórico;
- integração dos eventos suportados à Timeline Operacional;
- PDF Comercial e PDF Multi-Cotas derivados dos dados e snapshots correspondentes.

Snapshots preservam a leitura histórica do resultado mesmo quando engines ou interfaces evoluírem. PDFs são artefatos derivados e não substituem lead, simulação ou snapshot como fonte primária.

#### Dashboard Executivo Comercial

O Dashboard Executivo Comercial estabelece a primeira camada gerencial derivada sobre o CRM existente.

O dashboard consolida:

- total de leads;
- leads quentes e sua participação na base;
- leads com ação vencida;
- leads sem próxima ação pendente;
- distribuição por temperatura;
- distribuição pelas etapas existentes;
- leads com e sem Check Points;
- total de Check Points encontrados;
- leads simulados;
- total de simulações;
- leads com Multi-Cotas;
- atividade baseada exclusivamente em `updatedAt` nos últimos 30 dias.

Sua arquitetura é somente leitura, derivada e sem persistência própria. O dashboard não cria scoring, previsão, probabilidade, ranking, recomendação, automação ou nova fonte de verdade.

### Resultado Obtido

Ao final da fase de CRM Operacional, o EVOLV dispõe de um fluxo arquitetural integrado:

```text
Identidade e organização
        ↓
Lead e Pipeline
        ↓
Dossiê Executivo Vivo
        ↓
Notas + Tarefas + Simulações
        ↓
Timeline Operacional
        ↓
Meu Dia + Check Points
        ↓
Dashboard Executivo Comercial
```

Esse fluxo transforma registros comerciais dispersos em uma operação rastreável, consultável e gerenciável, preservando as fontes originais e evitando duplicidade de estado.

O resultado arquitetural consolidado é um CRM capaz de:

- manter uma base comercial autenticada e isolada por organização;
- estruturar o ciclo do lead;
- registrar contexto e histórico operacional;
- orientar a execução diária por tarefas reais;
- preservar simulações e artefatos comerciais associados ao lead;
- apresentar indicadores descritivos da operação sem extrapolar os dados disponíveis.

### Limites do Marco

Este documento não autoriza implementação.

Este documento não aprova backlog.

Este documento não aprova sprint.

Este documento não cria requisitos.

Este documento não cria roadmap executável.

Toda futura sprint deverá possuir documento próprio aprovado.

Nenhuma funcionalidade poderá ser iniciada apenas com base neste marco.

O registro de encerramento não declara que todo fluxo futuro esteja desenhado, que toda dívida técnica esteja resolvida ou que toda hipótese gerencial tenha sido validada. Ele registra somente a consolidação da fase operacional documentada até este ponto.

### Backlog Futuro (Não Executável)

Temas possíveis para discussão futura:

- Conversão;
- Aging;
- Health Score;
- Lead Scoring;
- Performance Comercial;
- Inteligência Operacional;
- produtividade por equipe;
- tempos entre etapas;
- qualidade e completude dos dados;
- governança de indicadores;
- auditoria de artefatos comerciais;
- evolução da arquitetura de leitura gerencial.

Os temas listados não representam:

- sprint aprovada;
- roadmap aprovado;
- prioridade definida;
- autorização de implementação.

Nenhum tema desta lista possui regra, fórmula, escopo, prazo, responsável ou critério de aceite definido por este marco.

### Status Arquitetural Atual

```text
Fase: CRM Operacional
Status: Encerrada como marco arquitetural

Base atual:
CRM autenticado, operacional, rastreável e com leitura executiva derivada

Direção arquitetural possível:
CRM Gerencial e Inteligência Comercial

Autorização para próxima fase:
Não concedida por este documento
```

O EVOLV encerra esta fase com uma fundação operacional consolidada. Qualquer avanço posterior deverá começar por diagnóstico atual, documento próprio, escopo explícito, governança aprovada e autorização específica de execução.
