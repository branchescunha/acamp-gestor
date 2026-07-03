# AcampGestor

Sistema web para gestão de acampamentos de igrejas, com equipes, participantes, pontuações, gincanas, inspeções, ranking e exportação de dados.

Produção: https://tribes-tournament.vercel.app

## Funcionalidades

- Ranking público das equipes por URL do acampamento.
- Painel administrativo protegido por autenticação.
- Perfis administrativos com separação entre ADMIN e GESTOR.
- Gestão administrativa de perfis de acesso.
- Gestão de organizações, igrejas, escolas ou instituições.
- Convites administrativos para organizar criação manual de usuários.
- Solicitação controlada de acesso administrativo.
- Revisão administrativa de solicitações de acesso.
- Recuperação e redefinição de senha.
- Gestão de acampamentos.
- Seleção de acampamento ativo.
- Cadastro e edição de equipes.
- Cadastro e filtragem de participantes.
- Registro de pontos e penalidades.
- Histórico de lançamentos.
- Controle de gincanas.
- Controle de inspeções de quartos.
- Exportação completa dos dados em Excel.
- Interface responsiva para celular e notebook.

## Tecnologias Utilizadas

- React
- Vite
- Tailwind CSS
- Supabase
- React Router
- Lucide React
- ExcelJS

## Rotas Principais

- `/:campSlug`: ranking público do acampamento por URL própria.
- `/:campSlug/admin`: painel do gestor daquele acampamento.
- `/:campSlug/admin/equipes`: gestão de equipes daquele acampamento.
- `/:campSlug/admin/participantes`: gestão de participantes daquele acampamento.
- `/:campSlug/admin/pontuacao`: lançamentos de pontos e penalidades daquele acampamento.
- `/:campSlug/admin/historico`: histórico de lançamentos daquele acampamento.
- `/:campSlug/admin/gincana`: controle da gincana daquele acampamento.
- `/:campSlug/admin/inspecoes`: controle de inspeções daquele acampamento.
- `/:campSlug/admin/exportacao`: exportação dos dados daquele acampamento.
- `/ranking`: página informativa para solicitar ou acessar um link público de ranking.
- `/login`: acesso ao painel administrativo.
- `/solicitar-acesso`: solicitação controlada de acesso administrativo.
- `/convite/:token`: aceite público de convite administrativo.
- `/recuperar-senha`: solicitação de recuperação de senha.
- `/redefinir-senha`: criação de nova senha via Supabase Auth.
- `/admin`: dashboard geral da plataforma, exclusivo para ADMIN.
- `/admin/conta`: configurações da conta.
- `/admin/organizacoes`: gestão de organizações.
- `/admin/organizacoes/:organizationId/membros`: gestão de membros da organização.
- `/admin/acampamentos`: gestão e seleção do acampamento ativo.
- `/admin/solicitacoes`: revisão de solicitações de acesso.
- `/admin/usuarios`: gestão de perfis de acesso.
- `/admin/convites`: gestão de convites administrativos.
- `/admin/tribos`: gestão de equipes.
- `/admin/participantes`: gestão de participantes.
- `/admin/pontuacao`: lançamentos de pontos e penalidades.
- `/admin/historico`: histórico de lançamentos.
- `/admin/gincana`: controle da gincana.
- `/admin/inspecoes`: controle de inspeções.
- `/admin/exportacao`: exportação dos dados.

As rotas antigas `/forgot-password`, `/reset-password` e `/admin/account` continuam disponíveis apenas como compatibilidade e redirecionam para as rotas em português.

## Autenticação

O login usa e-mail e senha do Supabase Auth.

O AcampGestor trabalha com três tipos de acesso:

- ACAMPANTE: não possui login e acessa apenas o ranking público do acampamento em `/:campSlug`.
- GESTOR: possui login e gerencia apenas os próprios acampamentos pelo painel `/:campSlug/admin`.
- ADMIN: possui login, acessa o dashboard geral em `/admin`, revisa solicitações, vê todos os acampamentos e pode gerenciar qualquer acampamento.

O cadastro aberto ainda não existe neste MVP. A rota `/solicitar-acesso` salva pedidos de acesso na tabela `access_requests`, mas não cria usuário automaticamente.

Usuários administrativos ainda devem ser criados manualmente no Supabase Auth. A aprovação de uma solicitação em `/admin/solicitacoes` apenas marca o pedido como aprovado para controle interno.

Depois de criar o usuário manualmente no Supabase Auth, também é necessário criar o perfil correspondente na tabela `profiles` com role `admin` ou `gestor`.

O ADMIN pode criar e editar perfis em `/admin/usuarios`, informando o User UID do usuário já existente no Supabase Auth. A tela permite ajustar nome, e-mail, papel e status, mas não cria usuários Auth automaticamente.

O ADMIN também pode organizar convites administrativos em `/admin/convites`. Convites registram nome, e-mail, papel, status, observações e controle de envio assistido, mas não criam usuário Auth, não criam profile automaticamente e não enviam e-mail real automaticamente.

O dashboard geral em `/admin` é exclusivo para ADMIN e apresenta métricas da plataforma, atalhos administrativos e visão recente de organizações, acampamentos e solicitações de acesso. GESTOR continua usando os fluxos permitidos, principalmente `/admin/acampamentos` e o painel do acampamento por slug.

Convites podem ser aceitos pela rota pública `/convite/:token`. O usuário Auth ainda precisa existir antes. Ao aceitar o convite autenticado com o e-mail correto, o sistema cria ou atualiza o profile do usuário logado e marca o convite como aceito.

Fluxo atual para criar um GESTOR:

1. Criar ou registrar um convite em `/admin/convites`.
2. Criar o usuário em Supabase Auth.
3. Copiar o link ou a mensagem pronta em `/admin/convites`.
4. Enviar manualmente pelo canal escolhido ou abrir o cliente local com `mailto:`.
5. Marcar o convite como enviado para controle interno.
6. O convidado entra com o e-mail convidado.
7. O convidado ativa o acesso pelo link do convite.

A recuperação de senha começa em `/recuperar-senha` e a redefinição acontece em `/redefinir-senha`.

## Banco de Dados

Os scripts SQL versionados devem ser executados manualmente no Supabase SQL Editor, na ordem abaixo.

Para habilitar as solicitações de acesso reais, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/001_create_access_requests.sql
```

Esse script cria a tabela `access_requests`, ativa RLS e define policies para:

- visitantes anônimos criarem solicitações pendentes;
- visitantes anônimos não listarem solicitações;
- usuários autenticados listarem solicitações;
- usuários autenticados revisarem solicitações.

Para habilitar a gestão de acampamentos, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/002_create_camps.sql
```

Esse script cria a tabela `camps`, ativa RLS e permite que cada usuário autenticado crie, liste e edite apenas os próprios acampamentos.

O acampamento ativo é salvo localmente no navegador com a chave `acampgestor.activeCampId`. A seleção aparece no layout administrativo e define quais dados operacionais são exibidos nas telas.

Para vincular os dados operacionais ao acampamento ativo, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/003_add_camp_id_to_operational_tables.sql
```

Esse script adiciona `camp_id` nullable em `tribes`, `participants`, `score_events`, `gymkhana_events`, `gymkhana_settings` e `room_inspections`, além de criar índices para consulta por acampamento.

Dashboard, ranking, equipes, participantes, pontuação, histórico, exportação, gincanas e inspeções usam apenas dados do acampamento ativo. Dados antigos com `camp_id` vazio não são exibidos quando há um acampamento ativo selecionado.

A migração de dados antigos deve ser feita manualmente e com cuidado. O próprio arquivo SQL inclui uma orientação comentada para associar dados antigos a um acampamento, caso isso seja necessário.

Para habilitar ranking público por URL do acampamento, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/004_add_public_slug_to_camps.sql
```

Esse script adiciona `slug` e `public_ranking_enabled` em `camps`, cria índice único para URLs públicas, bloqueia slugs reservados e libera leitura pública apenas de acampamentos com ranking público ativo.

A leitura pública do ranking usa somente colunas mínimas de `camps` e views públicas restritas para `tribes`, `participants` e `score_events`. Dados pessoais completos de participantes, contatos, observações, solicitações de acesso, gincanas e inspeções não são expostos pelo ranking público.

O ranking público por slug usa a rota `/:campSlug`, por exemplo `/retiro-de-jovens-2026`, e não depende do acampamento ativo salvo no navegador.

O painel do gestor por slug usa a rota `/:campSlug/admin`. Ao acessar essa rota autenticado, o sistema resolve o acampamento pelo slug, define esse acampamento como ativo e reutiliza as telas administrativas existentes. A rota `/admin` exibe o dashboard geral da plataforma para ADMIN.

Para habilitar perfis e permissões reais de ADMIN e GESTOR, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/005_create_profiles_and_roles.sql
```

Esse script cria a tabela `profiles`, funções auxiliares de autorização, policies para solicitações de acesso, acampamentos e dados operacionais, além de restringir gestores aos acampamentos criados por eles.

O primeiro ADMIN deve ser vinculado manualmente a um usuário existente do Supabase Auth:

```sql
insert into public.profiles (id, name, role, status)
values ('<auth-user-id>', 'André Cunha', 'admin', 'active');
```

Gestores também devem ser vinculados manualmente após a criação do usuário no Supabase Auth:

```sql
insert into public.profiles (id, name, role, status)
values ('<auth-user-id>', '<Nome do Gestor>', 'gestor', 'active');
```

Para adicionar e-mail opcional aos perfis e facilitar a gestão visual no painel ADMIN, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/006_add_profile_email.sql
```

Esse script adiciona `email` nullable em `profiles`, cria um índice único parcial para e-mails preenchidos e atualiza os grants de insert/update. Convites automáticos e criação automática de usuários Auth ficam para evolução futura.

Para habilitar convites administrativos, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/007_create_invitations.sql
```

Esse script cria a tabela `invitations`, ativa RLS e permite que apenas ADMIN leia, crie e atualize convites. A criação de usuários Auth, envio de e-mail, Edge Function e uso de service role continuam fora desta versão.

Para habilitar o aceite público de convites, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/008_create_invitation_acceptance_functions.sql
```

Esse script cria as funções RPC `get_invitation_by_token` e `accept_invitation`. A primeira expõe apenas dados mínimos do convite pelo token. A segunda permite que um usuário autenticado com o e-mail correto aceite o convite, criando ou atualizando o profile correspondente. O script não cria usuário Auth automaticamente e não usa service role.

Para habilitar o controle de envio assistido de convites, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/009_add_invitation_delivery_fields.sql
```

Esse script adiciona `sent_at` e `sent_by` em `invitations` para registrar quando um ADMIN marcou o convite como enviado. A tela `/admin/convites` permite copiar o link, copiar uma mensagem pronta, abrir o cliente de e-mail local com `mailto:` e marcar o convite como enviado. O sistema ainda não envia e-mail real automaticamente, não usa Edge Function e não usa service role para criar usuários.

Para habilitar a base de organizações, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/010_create_organizations.sql
```

Esse script cria `organizations` e `organization_members`, adiciona `organization_id` nullable em `camps`, cria índices e configura RLS para ADMIN e GESTOR. A estrutura permite evoluir de usuário -> acampamentos para organização -> membros -> acampamentos sem migrar ou apagar dados antigos automaticamente.

A rota `/admin/organizacoes` permite que ADMIN veja todas as organizações e que GESTOR veja as organizações em que participa. Ao criar uma organização pela tela, o usuário logado é vinculado como `owner` em `organization_members`. A gestão avançada de membros fica para evolução futura.

Em `/admin/acampamentos`, o campo Organização é opcional. Acampamentos antigos sem `organization_id` continuam funcionando, e a migração desses registros deve ser feita manualmente apenas quando houver necessidade.

Para habilitar a gestão de membros de organizações, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/011_manage_organization_members.sql
```

Esse script adiciona funções e policies para gerenciar membros em `organization_members`, além da RPC `add_organization_member_by_email`. ADMIN pode gerenciar membros de qualquer organização. Membros com role `owner` podem adicionar e atualizar membros da própria organização. Membros com role `manager` participam da organização e podem visualizar os membros, mas não gerenciam permissões.

A rota `/admin/organizacoes/:organizationId/membros` permite adicionar membros por e-mail de profile existente, alterar role entre `owner` e `manager` e alterar status entre `active` e `suspended`. O usuário precisa já existir em `profiles`; esta versão não cria usuário Auth automaticamente, não cria profile automaticamente, não envia e-mail e não implementa delete de membros.

Para reforçar a segurança de organizações e membros, execute manualmente no Supabase SQL Editor o arquivo:

```text
supabase/sql/012_organization_security_hardening.sql
```

Esse script impede que uma organização fique sem pelo menos um `owner` ativo, reforça a policy de atualização de `organization_members` e mantém `manager` apenas com permissão de visualização. ADMIN continua podendo gerenciar organizações e membros, mas também respeita a regra de manter um `owner` ativo. O SQL não cria delete, não cria usuários automaticamente e não altera os scripts anteriores.

## Variáveis de Ambiente

O projeto depende de variáveis de ambiente para conexão com o Supabase.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Valores reais de ambiente não devem ser versionados no Git.

## Deploy

Plataforma recomendada: Vercel.

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

O projeto inclui `vercel.json` com fallback para `index.html`, necessário para rotas client-side após refresh ou acesso direto.

Configure no Supabase Auth as URLs de redirecionamento:

Local:

- `http://localhost:4000`
- `http://localhost:4000/redefinir-senha`
- `http://localhost:4000/**`

Produção:

- `https://tribes-tournament.vercel.app`
- `https://tribes-tournament.vercel.app/redefinir-senha`
- `https://tribes-tournament.vercel.app/**`

## Status do Projeto

MVP funcional em evolução.

O AcampGestor já cobre o fluxo principal de gestão de acampamentos, organizações, pontuação, ranking público por URL, administração, solicitações de acesso, seleção de acampamento ativo, dados operacionais por acampamento e exportação. Próximas evoluções devem tratar personalização por evento, identidade visual configurável e suporte mais avançado para uso por outras igrejas.

## Observações Técnicas

- O build de produção passa, mas o Vite ainda alerta que alguns chunks passam de 500 kB.
- O `npm audit` pode reportar 2 vulnerabilidades moderadas em `uuid` via `exceljs`.
- A correção automática dessas vulnerabilidades exige `npm audit fix --force` e alteração insegura/downgrade do `exceljs`; por isso, foi aceita temporariamente.
- A rota `/admin/tribos` foi mantida por compatibilidade técnica, embora a comunicação visível use "equipes".
- `camp_id` ainda é nullable para permitir migração gradual de dados antigos.
- `organization_id` em `camps` ainda é nullable para permitir adoção gradual de organizações.
- Roles e permissões administrativas foram estruturadas com `profiles`, ADMIN e GESTOR. A criação de usuários no Supabase Auth ainda é manual nesta versão.
- Membros de organizações usam roles `owner` e `manager`. O delete de membros fica para evolução futura.
- A tela `/admin/usuarios` gerencia apenas profiles; ela não cria contas no Supabase Auth e não envia convites automáticos.
- A tela `/admin/convites` organiza convites administrativos, gera links públicos de aceite e auxilia o envio manual, mas não automatiza criação de usuários Auth nem envio real de e-mails.
- A rota `/convite/:token` aceita convites apenas para usuários autenticados com o e-mail convidado.

## Estrutura do Projeto

```text
src/
  components/   Componentes reutilizáveis da interface
  data/         Dados iniciais e apoios locais
  domain/       Regras puras de ranking e pontuação
  hooks/        Hooks compartilhados
  lib/          Configuração de integrações
  pages/        Telas principais da aplicação

supabase/
  sql/          Scripts SQL para configuração manual no Supabase
```

## Autor

André Vinícius
