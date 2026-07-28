# OPP-002 — Oferta de Lance

`contract_bid_offers` é a fonte oficial e versionada das ofertas comerciais
derivadas de estratégias em `contract_bids`. A oferta não transforma um
rascunho interno em lance submetido.

O fluxo permitido é `draft → generated → sent → approved/rejected` e, quando
aprovada e vinculada a um lance, `approved → submitted`. Versões geradas são
imutáveis; alterações criam uma nova linha com o próximo número de versão.

Os PDFs são gerados no servidor com a identidade EVOLV/Patrion e armazenados no
bucket privado `contract-bid-offers`. O caminho começa pelo `organization_id` e
URLs assinadas expiram em cinco minutos. O download não cria evento para evitar
ruído; criação, geração, compartilhamento, aprovação, rejeição e submissão são
registrados atomicamente na Timeline.

Não existe provider oficial de e-mail. E-mail e WhatsApp são compartilhamentos
assistidos: o sistema prepara conteúdo e registra início, nunca entrega.
