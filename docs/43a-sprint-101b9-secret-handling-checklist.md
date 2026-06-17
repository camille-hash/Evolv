# Sprint 101B.9 — Secret Handling Checklist

## Regra principal

Credenciais administrativas devem ser usadas apenas de forma temporaria, manual e fora do repositorio.

## Checklist obrigatorio

- nunca commitar `service_role`
- nunca salvar secrets em docs
- nunca salvar secrets em `.env`
- nunca salvar secrets em `.env.local`
- nunca colar secrets em logs
- nunca colar secrets em prints destinados a documentacao
- nunca enviar secrets para Codex
- nunca enviar secrets para ChatGPT
- nunca registrar secrets em tickets
- nunca registrar secrets em markdown
- nunca registrar connection strings completas
- usar apenas execucao manual temporaria
- limpar terminal e historico quando aplicavel e permitido pelo operador
- fechar janelas/tabs administrativas ao final
- registrar apenas resultados sanitizados
- registrar apenas agregados quando forem suficientes
- revisar o conteudo antes de salvar qualquer evidencia

## O que pode ser registrado

- data e hora da verificacao
- operador
- ambiente
- contagens agregadas
- nulos agregados
- nomes de tabelas
- nomes de policies
- estado de RLS
- conclusao tecnica

## O que nao pode ser registrado

- publishable key
- anon key
- service role key
- JWTs
- access tokens
- refresh tokens
- cookies
- connection strings
- valores sensiveis desnecessarios de linhas individuais

## Criterio de seguranca

Se algum material de evidencia ainda contiver segredo ou dado sensivel desnecessario, ele nao deve ser salvo nem compartilhado ate ser sanitizado.
