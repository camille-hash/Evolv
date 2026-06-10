# 58 - Auditoria Pontual de E-mails Repetidos PipeRun

## Resumo Executivo

Esta auditoria verificou se os 628 e-mails repetidos identificados anteriormente pertencem aos leads/contatos ou se seriam e-mails internos de responsaveis da Patrion.

Conclusao:

- Os 628 repetidos se referem a `E-mail (Pessoa)` no arquivo de oportunidades.
- Portanto, sao e-mails de leads/contatos, nao e-mails internos da Patrion.
- Existe uma coluna interna com e-mails Patrion: `Dono da oportunidade`.
- Essa coluna possui apenas 2 e-mails unicos, Bruno e Carlos, mas nao foi a coluna usada para calcular os 628 repetidos.
- Para importacao, o e-mail do lead deve ser:
  - oportunidades: `E-mail (Pessoa)`;
  - contatos/telefones: `E-mail`.
- `Dono da oportunidade` e `Consultor (E-mail)` devem ser usados apenas como responsavel/consultor, nunca como e-mail do lead.

## Arquivos Analisados

Arquivos disponiveis na pasta do projeto EVOLV:

- `Banco Piperun.xlsx`
- `Banco Piperun telefone.xlsx`

Observacao:

- A solicitacao menciona `temp-imports/Banco Piperun.xlsx` e `temp-imports/Banco Piperun telefone.xlsx`.
- No workspace atual, os arquivos correspondentes estao na raiz do projeto EVOLV.

## Colunas de E-mail Identificadas pelo Nome

Foram consideradas colunas cujo nome contem `email`, `e-mail`, `mail` ou equivalente.

### Banco Piperun.xlsx

| Coluna | Preenchidos | Unicos | Classificacao | Top 10 repetidos |
| --- | ---: | ---: | --- | --- |
| `E-mail de contato (Empresa)` | 0 | 0 | Campo empresarial vazio | Sem valores |
| `E-mail (Pessoa)` | 759 | 434 | E-mail do lead/contato | `rogeriobisposantana1@gmail.com` 4x; `bio.quality.sv@outlook.com` 3x; `marccosbraz77@gmail.com` 3x; `cida@fedney.org` 3x; `atenagoss@gmail.com` 3x; `jessicasardinha042@gmail.com` 3x; `wagnercomper@icloud.com` 3x; `edimarsousa78@icloud.com` 3x; `elizeumigueldasilva5163@gmail.com` 3x; `paulacristianesantos123@gmail.com` 3x |

### Banco Piperun telefone.xlsx

| Coluna | Preenchidos | Unicos | Classificacao | Top 10 repetidos |
| --- | ---: | ---: | --- | --- |
| `Consultor (E-mail)` | 4 | 1 | E-mail interno/responsavel comercial | `bruno@patrionasset.com.br` 4x |
| `E-mail` | 452 | 451 | E-mail do lead/contato | `app.suporte@pipe.run` 2x; demais aparecem 1x entre os 10 primeiros: `fausto@crmpiperun.com`, `teste@gmail.com`, `caico@herreroarrabal.com.br`, `bvbussolaro@gmail.com`, `teste01@gmail.com`, `teste03@gmail.com`, `camille@temperlandia.com.br`, `josseniltonmonteirodacruz@gmail.com`, `sebastianlui1972@outlook.com` |

## Colunas com Conteudo de E-mail, Mesmo Sem "E-mail" no Nome

Tambem foi feita uma verificacao por conteudo, buscando colunas que possuem valores no formato de e-mail mesmo quando o nome da coluna nao contem a palavra e-mail.

### Banco Piperun.xlsx

| Coluna | Preenchidos | E-mails detectados | Unicos | Classificacao | Top repetidos |
| --- | ---: | ---: | ---: | --- | --- |
| `Dono da oportunidade` | 763 | 763 | 2 | E-mail interno da Patrion/responsavel comercial | `bruno@patrionasset.com.br` 548x; `carlos@patrionasset.com.br` 215x |
| `E-mail (Pessoa)` | 759 | 759 | 434 | E-mail do lead/contato | Mesmos repetidos listados acima |

### Banco Piperun telefone.xlsx

| Coluna | Preenchidos | E-mails detectados | Unicos | Classificacao | Top repetidos |
| --- | ---: | ---: | ---: | --- | --- |
| `Consultor (E-mail)` | 4 | 4 | 1 | E-mail interno da Patrion/responsavel comercial | `bruno@patrionasset.com.br` 4x |
| `E-mail` | 452 | 452 | 451 | E-mail do lead/contato | `app.suporte@pipe.run` 2x |

## Coluna Usada nas Auditorias Anteriores

A coluna usada nas auditorias anteriores como e-mail do lead foi:

- `E-mail (Pessoa)` no arquivo `Banco Piperun.xlsx`.

Evidencia:

- Essa coluna possui 759 valores preenchidos.
- Possui 434 e-mails unicos.
- Possui 628 linhas em que o e-mail aparece mais de uma vez.
- Nao possui e-mails internos `@patrionasset.com.br`.

Portanto, os 628 repetidos nao vieram de `Dono da oportunidade`.

## Coluna Correta para Importacao

### E-mail do lead em oportunidades

Usar:

- `E-mail (Pessoa)`

Nao usar:

- `Dono da oportunidade`
- `Nome do dono da oportunidade`
- `E-mail de contato (Empresa)`

### E-mail do lead em contatos/telefones

Usar:

- `E-mail`

Nao usar:

- `Consultor (E-mail)`
- `CS Responsável`

### Responsavel comercial

Usar:

- `Nome do dono da oportunidade`, quando disponivel.
- `Dono da oportunidade`, como e-mail interno do responsavel.
- `Consultor (E-mail)`, no arquivo de contatos, apenas como responsavel interno.

## Diagnostico dos 628 Repetidos

Os 628 repetidos se referem realmente a e-mails de leads/contatos.

Eles nao sao e-mails internos da Patrion.

Leitura correta:

- O arquivo possui multiplas oportunidades associadas ao mesmo lead.
- Isso e esperado em CRM, pois uma pessoa pode ter mais de uma oportunidade.
- Por isso, os repetidos nao devem ser tratados automaticamente como duplicidade a ser removida.

Leitura incorreta a evitar:

- Nao interpretar os 628 repetidos como repeticao de Bruno/Carlos.
- Nao deduplicar oportunidades por e-mail.
- Nao apagar oportunidades com mesmo e-mail.

## Recomendacao de Importacao

Recomendacao tecnica:

1. Usar `Hash` como `externalId` da oportunidade.
2. Usar `E-mail (Pessoa)` como e-mail do lead no arquivo de oportunidades.
3. Usar `E-mail` como e-mail do lead no arquivo de contatos.
4. Usar e-mail apenas para enriquecer telefone e cruzar contato.
5. Nao deduplicar por e-mail.
6. Permitir multiplas oportunidades com o mesmo e-mail quando o `Hash` for diferente.
7. Sinalizar e-mails repetidos no preview como "lead com multiplas oportunidades".
8. Tratar `Dono da oportunidade` e `Consultor (E-mail)` como responsavel comercial, nao como lead.

Conclusao operacional:

- A importacao continua viavel.
- Os e-mails repetidos sao reais do lado de leads/oportunidades.
- Eles devem ser preservados, nao eliminados.
- A chave de seguranca para importacao e `Hash`, nao e-mail.

## Confirmacao de Escopo

Esta sprint foi exclusivamente de auditoria e documentacao.

Nao foram alterados arquivos de codigo.
Nao foram importados dados.
Nao foram alterados CRM, Dashboard, Simulacao Comercial, Multi-Cotas, Supabase, localStorage, UI ou regras financeiras.

