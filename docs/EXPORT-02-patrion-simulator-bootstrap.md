# PATRION SIMULATOR — EXPORT-02 Standalone Bootstrap

# 1. Arquivos Criados

Foi criado um aplicativo Next.js independente em `patrion-simulator/`, com configuração, dependências e lockfile próprios.

Estrutura principal:

- `patrion-simulator/app/layout.tsx`: layout público e navegação mínima;
- `patrion-simulator/app/page.tsx`: Home com os dois produtos;
- `patrion-simulator/app/simulacao-comercial/page.tsx`: rota da Simulação Comercial;
- `patrion-simulator/app/multi-cotas/page.tsx`: rota Multi-Cotas;
- `patrion-simulator/components/commercial-simulator.tsx`: formulário, cálculo, resultado e acionamento do PDF Comercial;
- `patrion-simulator/components/multi-cotas-simulator.tsx`: formulário, cartas, resultado consolidado e acionamento do PDF Multi-Cotas;
- `patrion-simulator/app/globals.css`: estilos operacionais mínimos;
- `patrion-simulator/modules/**`: cópia local dos domínios necessários e contratos mínimos;
- `patrion-simulator/package.json` e `package-lock.json`: dependências autônomas;
- configurações TypeScript, ESLint, Next.js e PostCSS do standalone.

# 2. Arquivos Reutilizados

Os seguintes arquivos foram copiados logicamente sem mudanças de regra ou cálculo:

- `modules/simulator/engine.ts` → `patrion-simulator/modules/simulator/engine.ts`;
- `modules/simulator/presentation.ts` → `patrion-simulator/modules/simulator/presentation.ts`;
- `modules/multi-cotas/multi-cotas-engine.ts` → `patrion-simulator/modules/multi-cotas/multi-cotas-engine.ts`;
- `modules/multi-cotas/multi-cotas-types.ts` → `patrion-simulator/modules/multi-cotas/multi-cotas-types.ts`;
- `modules/reports/commercial-pdf.ts` → `patrion-simulator/modules/reports/commercial-pdf.ts`.

A comparação normalizada confirmou equivalência integral desses cinco arquivos. O PDF Comercial preserva o gerador, cálculos, disclaimer e estrutura já validados no EVOLV.

O PDF Multi-Cotas partiu de `modules/reports/multi-cotas-pdf.ts`, preservando layout, formatadores, métricas, INCC e disclaimer.

# 3. Adaptações Realizadas

- A Simulação Comercial ganhou um fluxo local direto: formulário → engine → apresentação → resultado → PDF.
- Os percentuais informados na UI são convertidos para taxas decimais antes de chegar ao contrato original do engine.
- O mês de contemplação é limitado ao prazo contratado antes de montar a apresentação.
- A interface Multi-Cotas usa diretamente `normalizeMultiCotasInput` e `calculateMultiCotas`.
- O contrato do PDF Multi-Cotas foi alterado de snapshot genérico para dados tipados atuais:

```ts
{
  input: MultiCotasInput;
  result: MultiCotasResult;
  title?: string;
  clientName?: string;
  simulationDate?: string;
}
```

- O botão “Gerar PDF Multi-Cotas” chama o relatório diretamente com `input` e `result` em memória.
- A Home e o layout foram reduzidos às duas rotas do produto, sem shell autenticado.
- O `turbopack.root` foi fixado no standalone para que o app trate seu próprio diretório como raiz de build.

# 4. Dependências Removidas

O standalone não importa nem executa:

- CRM ou `crm_leads`;
- `crm_lead_simulations`;
- lead ou contexto de lead;
- dossiê;
- timeline;
- notas;
- tasks;
- Meu Dia;
- Check Points;
- dashboard ou pipeline;
- Supabase;
- Auth;
- RLS;
- APIs do EVOLV;
- `sessionStorage`.

A única ocorrência textual de “CRM” está na descrição da Home informando que o produto funciona sem essa dependência.

# 5. Funcionalidades Entregues

- Home pública e funcional;
- navegação entre Simulação Comercial e Multi-Cotas;
- formulário completo de Simulação Comercial;
- cálculo em tempo real usando o engine original;
- seleção de cenário, seguro, lance e contemplação;
- resultado comercial com crédito, parcelas, investimento, venda e ganho;
- dados comerciais opcionais para o PDF;
- geração do PDF Comercial original;
- formulário Multi-Cotas com parâmetros compartilhados e edição individual das cartas;
- normalização entre 2 e 30 cartas usando o engine original;
- resultado consolidado e detalhamento por carta;
- geração do PDF Multi-Cotas diretamente do resultado atual;
- layout operacional responsivo, sem overflow de página em viewport móvel.

Validações executadas no standalone:

- `npm.cmd run typecheck`: aprovado;
- `npm.cmd run lint`: aprovado;
- `npm.cmd run build`: aprovado;
- rotas estáticas `/`, `/simulacao-comercial` e `/multi-cotas`: geradas;
- smoke test de alteração do crédito comercial: resultado recalculado;
- smoke test de alteração da quantidade de cartas: tabela e consolidado recalculados;
- botão do PDF Comercial: arquivo gerado sem erro de console;
- botão do PDF Multi-Cotas: arquivo gerado sem erro de console;
- PDF Comercial gerado: 4 páginas e conteúdo extraível esperado;
- PDF Multi-Cotas gerado: 3 páginas, INCC, cartas, consolidado, paginação e disclaimer presentes;
- viewport móvel: sem overflow horizontal da página nas duas rotas.

# 6. Pendências

Não há pendência bloqueadora para o bootstrap funcional.

Itens deliberadamente adiados:

- branding definitivo do standalone e dos PDFs;
- persistência local de simulações entre sessões;
- testes automatizados de regressão dos engines e dos documentos;
- revisão visual manual dos PDFs em múltiplos leitores e sistemas operacionais;
- configuração do ambiente de publicação independente.

# 7. Próxima Sprint Recomendada

**EXPORT-03 — Hardening e publicação independente.**

Escopo recomendado:

1. adicionar testes unitários que comparem resultados dos engines com fixtures do EVOLV;
2. adicionar testes de integração dos dois formulários e contratos de PDF;
3. definir branding textual mínimo sem alterar cálculos ou disclaimers;
4. revisar acessibilidade dos campos e tabelas;
5. validar PDFs visualmente em desktop e mobile, incluindo documentos com 2 e 30 cartas;
6. definir persistência local somente se houver requisito operacional;
7. preparar configuração de deploy do diretório `patrion-simulator/` como projeto independente.
