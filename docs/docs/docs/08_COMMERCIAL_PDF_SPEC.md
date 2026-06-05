Implementar a próxima fase do EVOLV: PDF comercial do Simulator.

Leia antes:

* `04_SIMULATOR_MODULE_SPEC.md`
* `05_SIMULATION_ENGINE_SPEC.md`
* `06_POST_CONTEMPLATION_AND_SALE_SPEC.md`
* `07_LANCE_ENGINE_SPEC.md`

## Objetivo

Gerar um PDF comercial e profissional com os dados da simulação atualmente selecionada.

O PDF deve ser voltado para apresentação ao cliente final, não para auditoria técnica.

## Conteúdo obrigatório do PDF

Exibir:

* Crédito contratado;
* Crédito atualizado pelo INCC;
* Cenário selecionado: Parcela cheia, 70% ou 50%;
* Opção de seguro: Com seguro ou Sem seguro;
* Mês de contemplação;
* Parcela antes da contemplação;
* Parcela pós-contemplação;
* Total investido até contemplação;
* Tipo de lance: sem lance, lance embutido ou lance em dinheiro;
* Valor do lance, quando houver;
* Crédito líquido disponível;
* Valor estimado de venda da carta;
* Lucro estimado;
* Percentual de ganho;
* Múltiplo de alavancagem.

## Não exibir no PDF

Não mostrar:

* taxa administrativa;
* fundo de reserva;
* saldo devedor técnico;
* fórmulas;
* detalhes internos do cálculo.

## Layout

O PDF deve ter estética limpa, premium e comercial.

Estrutura sugerida:

1. Capa simples com nome EVOLV e título da simulação;
2. Resumo executivo;
3. Bloco de crédito e contemplação;
4. Bloco de parcelas;
5. Bloco de lance;
6. Bloco de venda da carta;
7. Bloco de resultado / alavancagem;
8. Observação final: “Simulação estimativa sujeita às regras da administradora e condições vigentes.”

## Implementação

Criar botão na interface:

`Gerar PDF`

Manter a lógica separada dos componentes visuais.

Preferir criar estrutura em:

* `modules/reports`
* ou `components/reports`

Não quebrar o motor atual.

## Fora do escopo

Não implementar ainda:

* salvar PDF no banco;
* enviar por e-mail;
* assinatura digital;
* área logada;
* CRM;
* IA;
* múltiplos clientes.

## Validações

Executar:

* `npm.cmd run lint`
* `npm.cmd run typecheck`
* `npm.cmd run build`

Retornar:

* biblioteca usada para PDF;
* arquivos criados/alterados;
* resumo da implementação;
* confirmação de funcionamento local.
