# OPP-001 — Oportunidades de Assembleia

`ASSEMBLY_D_MINUS_10` é uma leitura operacional derivada. Ela não é persistida
e não cria tarefas ou eventos artificiais. As fontes oficiais continuam sendo
`contracts`, `contract_assemblies` e `contract_bids`.

Uma oportunidade existe quando o contrato está `active`, a assembleia está
`scheduled` ou `postponed`, sua data local está entre hoje e D+10 inclusive e
não existe lance efetivo. Um lance `draft` não bloqueia a oportunidade.
`submitted`, `approved_by_client`, `rejected_by_client`, `not_contemplated`,
`contemplated` e `cancelled` bloqueiam porque já representam decisão ou
movimento operacional registrado.

O cálculo usa dias corridos no timezone `America/Sao_Paulo`. Datas são
comparadas como dias civis locais, evitando deslocamento na virada UTC.
Assembleias no próprio dia são `critical`; D+1 também é `critical`; D+2 a D+5
são `high`; D+6 a D+10 são `medium`.

A ordenação é por menor número de dias, maior crédito e nome do cliente. O ID
estável é `ASSEMBLY_D_MINUS_10:<assemblyId>`.

A API do Meu Dia resolve o perfil autenticado, obtém a organização no servidor
e filtra todas as leituras pelo mesmo `organization_id`. Nenhum identificador
de organização enviado pelo cliente é aceito.
