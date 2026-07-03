# AcampGestor

Plataforma web para gestão de acampamentos, equipes, participantes, pontuação, gincanas, inspeções, exportações e ranking público.

O AcampGestor foi desenvolvido como uma aplicação full stack para igrejas, escolas e organizações que precisam acompanhar eventos com equipes de forma organizada, visual e segura.

Produção: https://tribes-tournament.vercel.app

## Demonstração

As telas principais incluem:

- landing page pública;
- dashboard administrativo geral;
- gestão de organizações e membros;
- gestão de acampamentos;
- painel do gestor por URL do acampamento;
- ranking público por slug.

Ainda não há prints versionados no repositório.

## Funcionalidades

- Landing page pública do produto.
- Solicitação controlada de acesso.
- Aprovação automática de solicitações pelo ADMIN.
- Autenticação com Supabase Auth.
- Recuperação e redefinição de senha.
- Dashboard geral para ADMIN.
- Gestão de usuários e profiles.
- Gestão de convites administrativos.
- Aceite público de convite.
- Gestão de organizações.
- Gestão de membros por organização.
- Gestão de acampamentos.
- Painel do gestor por slug.
- Cadastro e edição de equipes/tribos.
- Cadastro e filtragem de participantes.
- Lançamento de pontos e penalidades.
- Histórico de lançamentos.
- Controle de gincanas.
- Controle de inspeções de quartos.
- Exportação de dados em Excel.
- Ranking público por slug do acampamento.
- Regras de acesso com ADMIN, GESTOR e ACAMPANTE.
- Separação de dados operacionais por acampamento ativo.

## Fluxo de Acesso

O fluxo principal de entrada de gestores começa em `/solicitar-acesso`.

Quando um ADMIN aprova uma solicitação em `/admin/solicitacoes`, a Edge Function `approve-access-request` executa o onboarding inicial no servidor:

- valida se o usuário autenticado é ADMIN ativo;
- cria ou reutiliza o usuário no Supabase Auth;
- cria ou atualiza o profile com role `gestor` e status `active`;
- cria ou reutiliza a organização informada na solicitação;
- vincula o gestor à organização como `owner`;
- registra o onboarding em `invitations`, quando compatível com o schema;
- marca a solicitação como aprovada;
- retorna um link de primeiro acesso para definição de senha, quando gerado com sucesso.

Convites administrativos continuam disponíveis como histórico, apoio ou fluxo manual secundário, mas não são mais etapa obrigatória para aprovar uma solicitação de acesso.

A tela pública de solicitação de acesso não aponta para um ranking genérico. Rankings públicos são acessados pelo slug real do acampamento, em `/:campSlug`.

## Tecnologias Utilizadas

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Supabase
- Supabase Auth
- Supabase Edge Functions
- PostgreSQL
- Row Level Security
- Lucide React
- ExcelJS
- `node:test`

## Rotas Principais

### Públicas

- `/`: landing page pública.
- `/login`: acesso ao painel administrativo.
- `/solicitar-acesso`: solicitação controlada de acesso.
- `/recuperar-senha`: solicitação de recuperação de senha.
- `/redefinir-senha`: redefinição de senha.
- `/convite/:token`: aceite público de convite administrativo.
- `/:campSlug`: ranking público do acampamento.

### Administração

- `/admin`: dashboard geral da plataforma, exclusivo para ADMIN.
- `/admin/solicitacoes`: revisão de solicitações de acesso.
- `/admin/usuarios`: gestão de profiles.
- `/admin/convites`: gestão de convites administrativos.
- `/admin/organizacoes`: gestão de organizações.
- `/admin/organizacoes/:organizationId/membros`: gestão de membros da organização.
- `/admin/acampamentos`: gestão e seleção de acampamentos.
- `/admin/conta`: configurações da conta.

### Painel do Gestor

- `/:campSlug/admin`: dashboard do acampamento.
- `/:campSlug/admin/equipes`: gestão de equipes.
- `/:campSlug/admin/participantes`: gestão de participantes.
- `/:campSlug/admin/pontuacao`: lançamento de pontuação.
- `/:campSlug/admin/historico`: histórico de lançamentos.
- `/:campSlug/admin/gincana`: controle de gincanas.
- `/:campSlug/admin/inspecoes`: controle de inspeções.
- `/:campSlug/admin/exportacao`: exportação de dados.

## Segurança e Permissões

O AcampGestor trabalha com três perfis principais:

- ACAMPANTE: não possui login e acessa apenas o ranking público do acampamento.
- GESTOR: possui login e gerencia os acampamentos aos quais tem permissão.
- ADMIN: gerencia a plataforma, usuários, convites, solicitações, organizações e acampamentos.

A segurança usa Supabase Auth, tabelas versionadas em SQL e Row Level Security no PostgreSQL.

As organizações possuem membros com roles `owner` e `manager`. A camada de segurança impede que uma organização fique sem pelo menos um `owner` ativo. Managers podem visualizar membros, mas não gerenciar permissões.

O ranking público usa views e consultas restritas para evitar exposição de dados sensíveis dos participantes.

A aprovação automática usa `ACAMPGESTOR_ADMIN_API_KEY` somente dentro da Edge Function. Essa secret deve receber uma chave administrativa server-side do Supabase. Ela não deve ser exposta no frontend, não deve entrar no `.env` do Vite e não deve ser commitada. `SUPABASE_SERVICE_ROLE_KEY` pode existir no runtime da Supabase, mas o projeto usa a secret customizada para evitar conflito com nomes reservados da CLI.

## Banco de Dados

Os scripts SQL ficam em `supabase/sql` e devem ser aplicados manualmente no Supabase, na ordem numérica.

Scripts versionados:

- `001_create_access_requests.sql`
- `002_create_camps.sql`
- `003_add_camp_id_to_operational_tables.sql`
- `004_add_public_slug_to_camps.sql`
- `005_create_profiles_and_roles.sql`
- `006_add_profile_email.sql`
- `007_create_invitations.sql`
- `008_create_invitation_acceptance_functions.sql`
- `009_add_invitation_delivery_fields.sql`
- `010_create_organizations.sql`
- `011_manage_organization_members.sql`
- `012_organization_security_hardening.sql`

## Estrutura do Projeto

```text
src/
  components/   Componentes reutilizáveis da interface
  data/         Dados iniciais e apoios locais
  domain/       Regras puras de ranking e pontuação
  hooks/        Hooks compartilhados
  lib/          Configuração do Supabase
  pages/        Telas da aplicação
  utils/        Utilitários compartilhados

supabase/
  functions/    Edge Functions do Supabase
  sql/          Scripts SQL versionados
```

## Checklist Final de Produção

- Variáveis do Supabase configuradas na Vercel.
- Secret `ACAMPGESTOR_ADMIN_API_KEY` configurada no ambiente da Edge Function.
- Edge Function `approve-access-request` deployada no Supabase.
- Auth Redirect URLs configuradas no Supabase.
- SQLs `001` a `012` aplicados no Supabase.
- Ranking público validado.
- Painel ADMIN validado.
- Painel por slug validado.
- Solicitações de acesso validadas.
- Aprovação automática de solicitações validada.
- Convites administrativos validados.

## Status

V1 finalizada para apresentação em portfólio.

Projeto desenvolvido para prática full stack, arquitetura de produto real, integração com Supabase, regras de autorização, RLS e organização profissional de código.

## Autor

André Cunha
