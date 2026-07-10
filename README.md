# AcampGestor

Plataforma web para gestão de acampamentos, retiros e eventos, com controle de organizações, acampamentos, Equipes/Quartos, Times competitivos, participantes, pontuações, gincanas, inspeções, ranking público e exportação em Excel.

O AcampGestor separa a administração da plataforma, a gestão operacional de cada acampamento e a visualização pública dos rankings. A aplicação foi estruturada para uso por igrejas, escolas e organizações que precisam organizar eventos com múltiplos responsáveis, dados isolados por acampamento e regras de acesso bem definidas.

Produção: https://acamp-gestor.vercel.app

## Demonstração

A aplicação está disponível em produção para demonstração do fluxo público e das interfaces autenticadas conforme o perfil de acesso.

Principais fluxos disponíveis:

- landing pública do produto;
- solicitação pública de acesso;
- painel ADMIN para gestão da plataforma;
- painel GESTOR para operação dos acampamentos permitidos;
- ranking público por slug do acampamento.

## Funcionalidades

### Acesso e autenticação

- autenticação com Supabase Auth;
- login por e-mail e senha;
- recuperação e redefinição de senha;
- página de conta do usuário;
- profiles com roles `admin` e `gestor`;
- status de acesso `active` e `suspended`.

### Plataforma ADMIN

- dashboard administrativo geral;
- revisão de solicitações de acesso;
- aprovação automática de gestores;
- gestão de usuários e profiles;
- gestão de convites administrativos;
- gestão de organizações;
- gestão de membros por organização;
- gestão de acampamentos;
- acesso administrativo às operações de acampamento conforme permissões.

### Gestão do acampamento

- área Meus acampamentos para GESTOR;
- painel por slug do acampamento;
- cadastro de Equipes/Quartos;
- cadastro de Times competitivos;
- cadastro de participantes;
- vínculo opcional de participante com Equipe/Quarto;
- vínculo opcional de participante com Time competitivo;
- lançamento de pontos e penalidades;
- gincana por Times competitivos;
- inspeções de quartos;
- histórico de lançamentos;
- dashboard competitivo;
- exportação Excel por acampamento.

### Público

- landing pública;
- solicitação de acesso;
- aceite de convite;
- ranking público por slug.

## Modelo de Domínio

O modelo separa organização operacional de competição.

Equipe/Quarto representa alojamento, organização interna e referência operacional do acampamento. Time competitivo representa a disputa de pontos, ranking e gincanas.

Exemplo:

```text
Participante: Maria
Equipe/Quarto: Levi
Time competitivo: Azul
```

Um participante pode possuir os dois vínculos, mas ambos são opcionais conforme o cadastro. Inspeções usam Equipes/Quartos. Pontuação competitiva, gincana e ranking atual usam Times competitivos.

O projeto preserva compatibilidade com dados operacionais anteriores, mas o fluxo competitivo atual usa Times.

## Perfis e Acesso

### ACAMPANTE

- não possui login;
- acessa apenas o ranking público do acampamento em `/:campSlug`.

### GESTOR

- possui login;
- acessa `/gestor`;
- gerencia apenas os acampamentos permitidos;
- opera o painel do acampamento em `/:campSlug/gestor/*`.

### ADMIN

- administra a plataforma em `/admin` e `/admin/*`;
- gerencia solicitações, usuários, convites, organizações e acampamentos;
- pode acessar operações administrativas de acampamento pela interface ADMIN.

ADMIN e GESTOR usam painéis separados. O painel ADMIN é da plataforma; o painel GESTOR é do acampamento.

## Aprovação de Acesso

O fluxo principal começa em `/solicitar-acesso`.

```text
Solicitação pública
-> solicitação pendente
-> aprovação por ADMIN
-> Edge Function approve-access-request
-> criação do acesso inicial do gestor
```

A Edge Function executa operações privilegiadas no servidor usando credencial administrativa do Supabase disponível no runtime. O caller é validado por JWT, profile ADMIN e status ativo.

Durante a aprovação, a função:

- valida o usuário autenticado;
- exige profile ADMIN ativo;
- cria ou reutiliza o usuário no Supabase Auth;
- cria ou atualiza o profile de GESTOR;
- cria ou reutiliza a organização;
- cria o vínculo inicial como owner;
- registra onboarding/convite;
- marca a solicitação como aprovada;
- gera link de primeiro acesso quando possível.

## Ranking Público

O ranking público fica disponível em `/:campSlug`, sem exigir login.

Esse acesso depende de ranking público habilitado no acampamento e usa views públicas específicas para retornar somente os dados mínimos necessários. O ranking usa Times competitivos ativos e não expõe dados pessoais completos dos participantes.

## Exportação

A exportação é feita por acampamento.

No painel ADMIN, a exportação usa um acampamento selecionado. No painel por slug, o GESTOR exporta somente o acampamento da URL atual.

O Excel reflete o modelo final do produto, com dados de:

- acampamento;
- Times competitivos;
- Equipes/Quartos;
- participantes;
- histórico;
- pontos positivos;
- penalidades;
- gincana;
- inspeções;
- estatísticas por Time.

Ranking e saldo competitivo usam Times. Inspeções permanecem ligadas a Equipes/Quartos.

## Arquitetura e Segurança

- autenticação com Supabase Auth;
- profiles com roles e status;
- Row Level Security no PostgreSQL;
- autorização por funções SQL, incluindo controle por acampamento;
- isolamento de dados operacionais por `camp_id`;
- organizações e memberships;
- painéis separados para ADMIN e GESTOR;
- views públicas mínimas para ranking;
- Edge Function para onboarding privilegiado;
- validação explícita de variáveis públicas do Supabase no frontend;
- exportação administrativa restrita a áreas autenticadas;
- sanitização de textos antes da geração Excel para reduzir risco de formula injection;
- headers básicos de segurança em produção.

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
- file-saver
- Node.js test runner / `node:test`
- Vercel

## Banco de Dados

Os scripts em `supabase/sql` representam a evolução versionada do schema, das relações de domínio e das políticas de acesso.

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
- `013_create_competition_teams.sql`

## Rotas Principais

### Públicas

- `/`
- `/login`
- `/solicitar-acesso`
- `/recuperar-senha`
- `/redefinir-senha`
- `/convite/:token`
- `/:campSlug`

### ADMIN

- `/admin`
- `/admin/conta`
- `/admin/solicitacoes`
- `/admin/usuarios`
- `/admin/convites`
- `/admin/organizacoes`
- `/admin/organizacoes/:organizationId/membros`
- `/admin/acampamentos`
- `/admin/tribos` - gestão de Equipes/Quartos
- `/admin/times`
- `/admin/participantes`
- `/admin/pontuacao`
- `/admin/gincana`
- `/admin/inspecoes`
- `/admin/historico`
- `/admin/exportacao`

### GESTOR

- `/gestor`
- `/:campSlug/gestor`
- `/:campSlug/gestor/conta`
- `/:campSlug/gestor/equipes`
- `/:campSlug/gestor/times`
- `/:campSlug/gestor/participantes`
- `/:campSlug/gestor/pontuacao`
- `/:campSlug/gestor/gincana`
- `/:campSlug/gestor/inspecoes`
- `/:campSlug/gestor/historico`
- `/:campSlug/gestor/exportacao`

As rotas `/:campSlug/admin/*` permanecem como compatibilidade e redirecionam para `/:campSlug/gestor/*`.

## Estrutura do Projeto

```text
src/
  components/   Componentes reutilizáveis da interface
  data/         Dados de apoio locais
  domain/       Regras puras de ranking e pontuação
  hooks/        Hooks compartilhados
  lib/          Configuração do Supabase
  pages/        Telas da aplicação
  utils/        Utilitários compartilhados

supabase/
  functions/
    approve-access-request/
  sql/

vercel.json
vite.config.js
package.json
```

## Status

A V1 está funcionalmente implementada e passou pelas validações automatizadas de testes, lint e build. A validação manual integrada dos fluxos permanece como etapa final de homologação.

Validação automatizada atual:

- 27 testes automatizados;
- lint aprovado;
- build de produção aprovado.

## Autor

André Cunha
