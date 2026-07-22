# Limpeza segura de dados QA

Esta rotina prepara inventário e dry-run para limpeza controlada de dados QA do AcampGestor.

Ela não deve ser usada contra produção. A execução real de remoção permanece bloqueada por padrão e exige confirmação humana explícita.

## Objetivo

Remover futuramente apenas dados de QA identificados por allowlist explícita, sem apagar dados reais, dados globais, usuários administrativos, funções, triggers, policies, views ou estrutura do banco.

## Comandos

```bash
npm run qa:inventory
npm run qa:cleanup:dry-run
npm run qa:cleanup
```

Nesta versão, a CLI não consulta Supabase automaticamente e não executa delete remoto. Ela valida configuração e prepara o modelo de inventário/dry-run para uma execução futura autorizada.

## Variáveis obrigatórias

Para inventário e dry-run:

```bash
TEST_ENV=local|staging
SUPABASE_TEST_URL=<url-local-ou-staging>
SUPABASE_TEST_PROJECT_REF=<project-ref-local-ou-staging>
QA_RUN_ID=QA-...
```

Também é obrigatório informar ao menos um critério de allowlist:

```bash
QA_CLEANUP_IDS=id1,id2
QA_CLEANUP_EMAILS=qa@example.test
QA_CLEANUP_SLUGS=qa-camp
QA_CLEANUP_PREFIXES=QA-...
QA_CLEANUP_ORGANIZATION_IDS=...
QA_CLEANUP_CAMP_IDS=...
```

Prefixos precisam começar com `QA-`. Não use filtros vagos como nome contém teste, data antiga, status inativo ou todos os registros.

## Cleanup real

Para cleanup real em staging, a ferramenta exige simultaneamente:

```bash
TEST_ENV=staging
QA_CLEANUP_ENABLED=true
QA_CLEANUP_CONFIRM=<token-informado-na-execucao>
QA_CLEANUP_CONFIRM_TOKEN=<token-secreto-fora-do-repositorio>
QA_RUN_ID=QA-...
```

O token não deve ser versionado. Não coloque secrets no repositório.

## Bloqueios implementados

A rotina bloqueia:

- produção por project ref `zuxndxchkeynvjqustxk`;
- URLs públicas de produção do AcampGestor;
- execução sem `TEST_ENV=local` ou `TEST_ENV=staging`;
- execução sem `QA_RUN_ID` começando com `QA-`;
- execução sem allowlist explícita;
- prefixos que não comecem com `QA-`;
- cleanup real sem `QA_CLEANUP_ENABLED=true`;
- cleanup real sem token externo;
- cleanup real sem adapter explícito de delete.

## Ordem de limpeza

A ordem foi derivada dos SQLs versionados e considera FKs de `camp_id`, `organization_id`, `profile_id` e `competition_team_id` com `ON DELETE RESTRICT`.

1. `score_events`
2. `gymkhana_events`
3. `room_inspections`
4. `gymkhana_settings`
5. `participants`
6. `competition_teams`
7. `tribes`
8. `invitations`
9. `access_requests`
10. `camps`
11. `organization_members`
12. `organizations`
13. `profiles`

## Auth users

Usuários do Supabase Auth não são removidos por esta rotina. Eles devem aparecer apenas como itens para revisão separada e exigir uma rotina administrativa específica usando Admin API, com autorização humana explícita.

Não prometa transação única entre Auth Admin API e PostgreSQL: são superfícies diferentes.

## Conferência do dry-run

O dry-run deve informar:

- tabela;
- quantidade;
- IDs;
- nomes seguros para conferência;
- organização relacionada;
- acampamento relacionado;
- ordem de remoção;
- itens bloqueados;
- itens não reconhecidos;
- Auth users para tratamento separado.

Todo relatório de dry-run deve deixar explícito: `0 registros removidos`.
