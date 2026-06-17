# Sprint 101B.6 - Risk Matrix

| Area | Risco | Impacto | Probabilidade | Mitigacao |
| --- | --- | --- | --- | --- |
| Schema | Divergencia entre schema real e schema esperado pelos scripts | Alto | Medio | Executar preflight antes de qualquer apply |
| CRM | CRM atual sofrer regressao indireta apos apply/policies | Critico | Medio | Aplicar em janela supervisionada + validar CRM apos cada etapa |
| Auth | Auth permanecer funcional no papel, mas falhar apos grants/policies conflitarem | Alto | Baixo/Medio | Validar Auth no pos-apply obrigatoriamente |
| Recovery | Recovery degradar por efeito colateral de ambiente/policies | Medio | Baixo | Smoke test explicito apos execucao |
| RLS | RLS das novas tabelas nascer correta no script, mas com efeito inesperado no banco real | Alto | Medio | Validar RLS real no banco e conferir aba Policies |
| Policies | Policy organization-scoped conter erro logico em relacionamento com lead/evento | Critico | Medio | Conferir preflight, apply sequencial e validation detalhada |
| Domain Wiring | Camada de dominio estar pronta, mas baseada em pressupostos ainda nao aplicados | Medio | Baixo | Manter camada isolada e sem ativacao funcional |
| Rollback | Rollback documental nao refletir perfeitamente o estado real apos apply | Alto | Medio | Confirmar backup e usar rollback apenas em janela supervisionada |
| Execucao Operacional | Falha humana na ordem dos scripts ou na interpretacao das validacoes | Critico | Medio/Alto | Usar runbook, checklist Go/No-Go e responsavel unico pela execucao |

## Leitura consolidada

### Riscos mais sensiveis

1. `Policies`
2. `CRM`
3. `Execucao Operacional`

### Risco central desta fase

O maior risco nao e falta de desenho tecnico, e sim executar sem evidencias reais suficientes sobre o estado atual do banco.
