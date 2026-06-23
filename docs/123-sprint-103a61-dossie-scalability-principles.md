# Sprint 103A.61 - Dossie Scalability Principles

## Domain Definition

Status: Arquitetura  
Tipo: Domain Definition  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Formalizar oficialmente os principios de escalabilidade do Dossie Multicanal do EVOLV.

Esta sprint e exclusivamente documental. Nao implementa funcionalidades, nao altera codigo, nao altera banco, nao altera frontend, nao altera backend, nao cria APIs e nao cria integracoes.

O objetivo exclusivo e consolidar:

- o problema de crescimento continuo do Dossie;
- a regra oficial de escalabilidade;
- a estrutura padrao de exposicao e recolhimento de historico;
- a aplicacao por dominio;
- as excecoes oficiais;
- a compatibilidade futura;
- os principios de UX executiva;
- a arquitetura oficial do padrao.

## Documentos Obrigatorios Consolidados

Esta definicao parte explicitamente de:

- `docs/117-sprint-103a55-dossie-multicanal-domain-definition.md`
- `docs/122-marco-02-memoria-relacionamento-consolidada.md`

## 1. Problema de Escalabilidade

O Dossie Multicanal organiza a memoria do relacionamento por lead. Isso significa que, ao longo do tempo, cada dominio tende a crescer de forma continua.

Esse crescimento afeta:

- Notas;
- Tarefas;
- Simulacoes;
- Multi-Cotas;
- Comunicacoes;
- Reunioes;
- Ligacoes.

Sem principio arquitetural de escalabilidade, o Dossie corre o risco de se transformar em:

- historico infinito expandido;
- superficie de leitura cansativa;
- lista cronologica de baixa prioridade visual;
- produto pouco executivo;
- estrutura onde o presente compete com o acumulado do passado.

O problema oficial, portanto, nao e apenas volume.

O problema e:

```text
Como preservar profundidade sem destruir leitura executiva.
```

Cada dominio pode crescer indefinidamente, mas o primeiro nivel do Dossie nao pode crescer sem limite.

## 2. Principio Oficial

O principio oficial de escalabilidade do Dossie Multicanal passa a ser:

```text
Ultimo Artefato
+
Historico Recolhivel
+
Visao Executiva
```

Esse principio define a forma correta de expor memoria crescente sem perder legibilidade.

### Definicao dos tres componentes

#### Ultimo Artefato

O elemento mais recente, mais ativo ou mais relevante do dominio deve receber protagonismo visual imediato.

Ele responde:

```text
O que importa agora neste dominio?
```

#### Historico Recolhivel

O acumulado historico deve permanecer acessivel, mas nao expandido por padrao.

Ele responde:

```text
O que aconteceu antes, quando eu quiser aprofundar?
```

#### Visao Executiva

A camada de leitura principal deve favorecer entendimento rapido, decisao e orientacao operacional.

Ela responde:

```text
Como este dominio contribui para o estado atual do relacionamento?
```

## 3. Estrutura Padrao

A estrutura padrao oficial do Dossie passa a ser:

### O que permanece expandido

Deve permanecer expandido por padrao:

- o ultimo registro relevante;
- o artefato ativo;
- o item que sustenta a leitura atual do dominio;
- o estado mais recente com valor operacional imediato.

### O que pode ser recolhido

Pode e deve ser recolhido:

- historico acumulado;
- registros anteriores;
- detalhes profundos nao essenciais para a primeira leitura;
- sequencias extensas do mesmo dominio.

### O contador de historico

Quando houver historico relevante, o Dossie deve assumir conceitualmente a existencia de contador de historico como marcador de profundidade disponivel.

O contador serve para responder:

```text
Existe memoria adicional alem do que estou vendo agora.
```

### Comportamento padrao de expansao

O comportamento padrao oficial e:

- primeiro mostrar o presente;
- depois indicar que existe historico;
- permitir aprofundamento sob demanda;
- evitar abrir tudo por padrao.

## 4. Escalabilidade por Dominio

### Notas

Problema de escala:

- notas tendem a acumular rapidamente;
- a leitura integral de todas compromete a densidade executiva.

Comportamento recomendado:

- ultima nota expandida;
- historico anterior recolhido;
- contador de historico visivel quando houver volume;
- leitura voltada ao contexto atual.

### Tarefas

Problema de escala:

- tarefas acumulam pendencias, concluidas e canceladas;
- o historico de execucao cresce mais rapido que a necessidade da leitura atual.

Comportamento recomendado:

- proxima acao ativa sempre em destaque;
- tarefas historicas fora do primeiro plano;
- leitura do estado atual antes do historico;
- acumulado de execucao tratado como profundidade.

### Simulacoes

Problema de escala:

- estudos e artefatos podem se multiplicar por lead;
- todos os snapshots abertos reduzem a clareza comercial.

Comportamento recomendado:

- ultimo estudo relevante em destaque;
- historico de simulacoes recolhivel;
- leitura sintese primeiro;
- detalhe tecnico apenas sob demanda.

### Multi-Cotas

Problema de escala:

- estudos sucessivos podem crescer rapidamente;
- historico completo aberto prejudica leitura.

Comportamento recomendado:

- ultimo estudo ou snapshot em destaque;
- historico recolhivel;
- acesso progressivo a profundidade;
- leitura condensada do artefato como primeira camada.

### Comunicacoes

Problema de escala:

- canais assincronos possuem potencial de milhares de mensagens e threads;
- a expansao completa destrói a leitura do Dossie.

Comportamento recomendado:

- ultima interacao relevante em destaque;
- historico completo por canal recolhido;
- contador de profundidade por conversa ou thread;
- leitura executiva centrada no estado da comunicacao, nao no despejo bruto.

### Reunioes

Problema de escala:

- reunioes acumulam encontros, resumos, participantes e artefatos;
- o primeiro nivel nao pode virar ata expandida.

Comportamento recomendado:

- ultimo encontro relevante ou proximo encontro em destaque;
- historico de encontros recolhivel;
- detalhes do encontro acessados sob demanda;
- leitura centrada no que ficou do encontro.

### Ligacoes

Problema de escala:

- chamadas podem se multiplicar rapidamente;
- tentativas sucessivas nao devem dominar o primeiro nivel do Dossie.

Comportamento recomendado:

- ultimo contato relevante ou necessidade de retorno em destaque;
- historico do canal recolhido;
- acumulado de tentativas tratado como profundidade;
- leitura centrada em resultado operacional, nao em log infinito.

## 5. Excecoes Oficiais

Algumas informacoes devem permanecer sempre visiveis e nunca podem ser relegadas ao historico recolhido quando forem o principal estado atual do lead.

### Devem permanecer sempre visiveis

- proxima acao ativa;
- status atual do lead, quando exibido no contexto do Dossie;
- Check Points relevantes;
- ultimo sinal com impacto operacional imediato;
- alertas de ausencia de proximo passo;
- indicacao de retorno necessario, quando for o estado atual dominante.

### Nunca devem ser recolhidas quando forem estado presente

- artefato ativo;
- evento mais recente que define o agora;
- sinal executivo atual;
- estado que exige decisao do consultor.

### Podem ser recolhidas

- acumulado historico anterior;
- registros antigos sem prioridade atual;
- sequencias extensas cujo valor principal e de consulta, nao de primeira leitura.

## 6. Compatibilidade Futura

O principio oficial precisa ser compativel com os dominios futuros e com a arquitetura ja consolidada.

### WhatsApp

Compativel porque:

- a ultima interacao pode ganhar destaque;
- o restante da conversa pode permanecer recolhido;
- o volume do canal nao invade o primeiro nivel.

### E-mail

Compativel porque:

- a thread mais relevante pode ser destacada;
- o historico de mensagens permanece sob demanda;
- a leitura executiva continua priorizando estado e nao corpo completo.

### Reunioes

Compativel porque:

- o ultimo encontro ou proximo encontro pode ser priorizado;
- a profundidade fica no dominio;
- o acumulado nao ocupa a superficie principal.

### Ligacoes

Compativel porque:

- o ultimo contato ou retorno necessario pode permanecer visivel;
- o historico de tentativas nao invade o primeiro plano.

### Timeline futura

Compativel porque:

- a Timeline ja nasce como leitura resumida;
- ela nao depende de historico completo expandido;
- seu crescimento futuro continua coerente com profundidade sob demanda.

## 7. Principios de UX Executiva

Os principios abaixo passam a ser formais dentro da arquitetura do Dossie:

### Principio 1 - O presente tem prioridade sobre o historico

O que exige leitura ou decisao agora deve vencer visualmente o acumulado do passado.

### Principio 2 - O historico nao compete visualmente com o estado atual

Historico existe para aprofundamento, nao para disputar protagonismo com o presente.

### Principio 3 - A profundidade e acessada sob demanda

Detalhe, memoria acumulada e sequencias extensas devem ser revelados quando o usuario desejar aprofundar.

### Principio 4 - A leitura executiva prevalece sobre volume

Mais informacao nao significa melhor arquitetura. A prioridade e entendimento rapido.

### Principio 5 - O volume deve ser absorvido pela estrutura, nao pela superficie

O crescimento do dominio deve ser acomodado pela forma de organizacao, nao por listas infinitas expandidas.

### Principio 6 - Cada dominio preserva sua propria profundidade

Escalabilidade nao significa apagar profundidade. Significa reposiciona-la corretamente.

## 8. Arquitetura Oficial

A regra passa a ser padrao oficial do Dossie Multicanal:

```text
Primeira camada:
  estado atual e ultimo artefato relevante

Segunda camada:
  historico recolhivel e contador de profundidade

Terceira camada:
  leitura executiva do dominio em coerencia com o Dossie
```

Aplicacao oficial:

```text
Dossie Multicanal
  nao cresce por expansao infinita
  cresce por profundidade organizada
```

Em termos consolidados:

```text
Ultimo Artefato
  sempre legivel

Historico Recolhivel
  sempre acessivel

Visao Executiva
  sempre preservada
```

## 9. Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- frontend;
- backend;
- banco;
- SQL;
- APIs;
- endpoints;
- integracoes;
- Dashboard;
- CRM;
- Pipeline;
- Auth;
- RLS;
- backlog executavel;
- commit;
- push.

## 10. Conclusao Arquitetural

O Dossie Multicanal passa a ter um principio oficial de escalabilidade aplicavel a todos os dominios de memoria.

A decisao central desta sprint e:

```text
O Dossie nao deve escalar por expansao infinita.
Deve escalar por destaque do presente, historico recolhivel e leitura executiva.
```

Isso protege simultaneamente:

- a clareza do produto;
- a coerencia entre dominios;
- a compatibilidade futura com canais de alto volume;
- a prioridade da decisao sobre o acervo bruto.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Apenas um arquivo novo criado.
- Nenhum arquivo de codigo alterado.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhum banco alterado.
- Nenhuma API criada.
- Nenhuma integracao criada.
- Nenhum commit executado.
- Nenhum push executado.
