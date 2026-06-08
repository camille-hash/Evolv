# 40 — Repository Layer Strategy

## 1. Problema Atual

Hoje o EVOLV utiliza `localStorage` diretamente a partir de modulos e componentes client-side.

Essa abordagem e adequada para validacao rapida porque:

- reduz complexidade inicial;
- evita autenticacao antes da hora;
- permite prototipar fluxos comerciais;
- permite testar a experiencia do Bruno sem backend.

Porem, esse desenho dificulta a futura migracao para Supabase se os componentes continuarem dependendo diretamente da origem dos dados.

O risco principal e espalhar detalhes de persistencia pela aplicacao. Quanto mais telas conhecerem `localStorage`, mais caro sera trocar a fonte de dados no futuro.

## 2. Arquitetura Desejada

Arquitetura conceitual:

```text
Frontend
↓
Repository Layer
↓
Data Source
↓
LocalStorage ou Supabase
```

Responsabilidades:

- `Frontend`: renderizar telas, receber interacoes e chamar casos de uso;
- `Repository Layer`: expor operacoes consistentes de leitura e escrita;
- `Data Source`: implementar a persistencia concreta;
- `LocalStorage`: fonte local atual;
- `Supabase`: fonte operacional futura.

## 3. Objetivo

O objetivo da camada de repositorios e permitir trocar a fonte de dados sem alterar componentes visuais.

Em vez de uma tela chamar diretamente `localStorage`, ela devera futuramente chamar um repositorio.

Exemplo conceitual:

```text
ClientPage
↓
ClientRepository
↓
LocalStorageClientDataSource
```

No futuro:

```text
ClientPage
↓
ClientRepository
↓
SupabaseClientDataSource
```

A tela nao deveria precisar saber qual data source esta ativo.

## 4. Repositories Futuros

### ClientRepository

Responsavel por clientes, perfil atual, contexto comercial e dados patrimoniais basicos.

### PortfolioRepository

Responsavel por carteira patrimonial, imoveis e cartas de consorcio.

### SimulationRepository

Responsavel por simulacoes salvas e snapshots de resultados.

### OperationRepository

Responsavel por multiplas operacoes patrimoniais do cliente.

### StrategyRepository

Responsavel por estrategias patrimoniais.

### FollowUpRepository

Responsavel por eventos de acompanhamento, prazos, boletos, assembleias e lances.

### NotificationRepository

Responsavel por preferencias, payloads e historico futuro de notificacoes.

### ReportRepository

Responsavel por metadados de relatorios gerados, como PDF da simulacao e Dossie EVOLV.

## 5. Interface Conceitual

Interfaces futuras devem ser simples, previsiveis e consistentes.

Operacoes conceituais:

```ts
getById(id)
list(filters)
create(payload)
update(id, payload)
delete(id)
```

Nem todo repositorio precisara implementar todos os metodos, mas o padrao deve ser consistente.

Exemplo conceitual:

```ts
type Repository<TRecord, TCreateInput, TUpdateInput> = {
  getById(id: string): Promise<TRecord | null>;
  list(filters?: Record<string, unknown>): Promise<TRecord[]>;
  create(input: TCreateInput): Promise<TRecord>;
  update(id: string, input: TUpdateInput): Promise<TRecord>;
  delete(id: string): Promise<void>;
};
```

Este exemplo e apenas documental. Nenhum repositorio deve ser criado nesta sprint.

## 6. Beneficios

Beneficios esperados:

- desacoplamento entre UI e persistencia;
- testes mais simples;
- migracao gradual para Supabase;
- suporte futuro a multiempresa;
- suporte futuro a multiusuario;
- isolamento de regras de acesso;
- menor risco ao trocar `localStorage` por backend;
- padrao reutilizavel entre produtos.

## 7. Estrategia de Migracao

### Fase 1: Repositories apontam para localStorage

Criar repositorios que preservam o comportamento atual, usando os storages locais ja existentes por baixo.

Objetivo: mudar a dependencia dos componentes sem alterar comportamento.

### Fase 2: Repositories passam a suportar Supabase

Adicionar data sources Supabase por entidade, mantendo a interface publica dos repositorios.

Objetivo: preparar troca controlada de origem de dados.

### Fase 3: Migracao gradual

Migrar entidade por entidade:

- clientes;
- carteira;
- acompanhamento;
- estrategias;
- simulacoes;
- operacoes;
- relatorios;
- notificacoes.

A migracao deve ser incremental, validada por modulo e sem reescrever a aplicacao inteira.

## 8. Compatibilidade

O padrao de repository deve ser reutilizavel por:

- EVOLV;
- LUMINA;
- ARUZZ;
- ELEVARE.

Cada produto pode ter entidades proprias, mas o contrato arquitetural deve ser parecido:

```text
UI
↓
Repository
↓
Data Source
```

Isso permite compartilhar padroes de teste, permissao, auditoria, cache, migracao e notificacoes.

## 9. Nao Fazer Agora

Nesta sprint, nao fazer:

- nao criar repositories reais;
- nao alterar componentes;
- nao alterar `localStorage`;
- nao criar Supabase;
- nao criar autenticacao;
- nao alterar UI;
- nao alterar Dashboard;
- nao alterar Apresentacao;
- nao alterar Simulacoes;
- nao alterar calculos;
- nao instalar dependencias.

Este documento e apenas uma estrategia arquitetural para uma migracao futura.
