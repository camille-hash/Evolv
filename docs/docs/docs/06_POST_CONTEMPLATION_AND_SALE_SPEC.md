Leia os documentos da pasta `docs`, especialmente:

* `04_SIMULATOR_MODULE_SPEC.md`
* `05_SIMULATION_ENGINE_SPEC.md`

Agora implemente a próxima etapa do Simulator: **parcela pós-contemplação, INCC e venda da carta**.

## 1. Parcela pós-contemplação

Regra:

### Cenário Parcela cheia

Quando o cenário selecionado for `Parcela cheia`, a parcela pós-contemplação permanece igual à parcela cheia.

### Cenários 70% e 50%

Quando o cenário selecionado for `70%` ou `50%`, calcular:

`parcela_pos_contemplacao = parcela_cheia + ((total_investido_ate_contemplacao_parcela_cheia - total_investido_ate_contemplacao_cenario_selecionado) / meses_restantes)`

Onde:

`meses_restantes = prazo_total - mes_contemplacao`

Regras de segurança:

* Se `meses_restantes <= 0`, evitar divisão por zero.
* Nesse caso, usar a parcela cheia como fallback ou exibir aviso.
* A conta deve respeitar a opção selecionada: `com seguro` ou `sem seguro`.

## 2. INCC

Implementar campo `INCC (%)`.

Regra:

* O INCC reajusta o valor do crédito e da parcela a cada 12 meses.
* O reajuste deve ser aplicado de forma anual, a cada bloco completo de 12 meses.
* Usar o mês de contemplação como referência para calcular quantos reajustes ocorreram.

Fórmula:

`quantidade_reajustes = floor(mes_contemplacao / 12)`

`fator_incc = (1 + incc_percentual) ^ quantidade_reajustes`

`credito_atualizado = credito_base * fator_incc`

As parcelas exibidas devem considerar o mesmo fator de reajuste quando aplicável.

## 3. Venda da carta

Implementar campo `Venda da carta (%)`.

Regra:

`valor_venda_carta = credito_atualizado * percentual_venda_carta`

Exibir na área comercial:

* Valor estimado de venda da carta;
* Lucro estimado em R$;
* Percentual de ganho.

Fórmulas:

`lucro_venda_carta = valor_venda_carta - total_investido_ate_contemplacao`

`percentual_ganho = lucro_venda_carta / total_investido_ate_contemplacao`

Formatar o percentual como porcentagem.

## 4. Apresentação comercial

Na área principal, mostrar:

* Crédito contratado;
* Crédito atualizado pelo INCC;
* Cenário selecionado;
* Com seguro / sem seguro;
* Mês de contemplação;
* Parcela antes da contemplação;
* Parcela pós-contemplação;
* Total investido até contemplação;
* Valor estimado de venda da carta;
* Lucro estimado;
* Percentual de ganho.

Não mostrar:

* taxa administrativa;
* fundo de reserva;
* saldo devedor;
* fórmulas internas.

## 5. Arquitetura

Não colocar fórmulas dentro dos componentes visuais.

Criar ou ajustar funções dentro do módulo:

`modules/simulator`

Preferencialmente manter:

* cálculo base em `engine.ts`;
* regras de apresentação em `presentation.ts`.

## 6. Fora do escopo

Não implementar ainda:

* PDF;
* lance embutido;
* lance em dinheiro;
* CRM;
* área logada;
* IA;
* integração externa.

## 7. Validações

Ao final, executar:

* `npm.cmd run lint`
* `npm.cmd run typecheck`
* `npm.cmd run build`

Retornar:

* arquivos alterados;
* resumo das regras implementadas;
* confirmação de que o projeto roda localmente.
