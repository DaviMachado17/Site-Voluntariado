# PRD — Blog Voluntariado EPFF-INTEP

## Problem Statement
"Preciso de um blog sobre voluntariado e solidariedade onde apresenta varias turmas da escola de cursos proficionais EPFF-INTEP, preciso que seja organizado tenha a logo da escola."

## User Choices
- 5 turmas destacadas
- Funcionalidades: visualização de posts, área admin (CRUD) e comentários de visitantes
- Paleta: Verde, Azul escuro, Laranja (cores institucionais EPFF-INTEP)
- Idioma: Português (Portugal)
- Logótipo fornecido pelo utilizador

## Architecture
- **Backend**: FastAPI + Motor (Mongo) com JWT (Bearer) — admin seeded from `.env`.
- **Frontend**: React + React Router + Tailwind (Cormorant Garamond / Outfit / DM Sans) com `@/` alias.
- **Auth**: JWT em `localStorage` (`epff_token`) enviado em `Authorization: Bearer` via axios interceptor.
- **Seed**: ao arrancar, cria admin, 5 turmas e 5 posts iniciais.

## Persona
- **Visitante** — lê artigos, filtra por turma, deixa comentários (sujeitos a aprovação).
- **Administrador** (escola) — cria/edita/apaga artigos e turmas; modera comentários.

## Implemented (2025-12-01)
- [x] Backend REST (`/api/stats`, `/api/turmas`, `/api/posts`, `/api/posts/{id}/comments`, `/api/auth/*`, `/api/admin/comments`).
- [x] Seed automático de 5 turmas e 5 posts.
- [x] Public frontend: Home, Blog (com filtro por turma), PostDetail (com comentários), Turmas, TurmaDetail, Sobre.
- [x] Painel admin com 3 separadores: Artigos / Turmas / Comentários.
- [x] Design institucional com o logótipo EPFF-INTEP em header e footer.
- [x] Test credentials em `/app/memory/test_credentials.md`.

## Backlog
- **P1** — Upload de imagens diretamente no painel (em vez de URL).
- **P1** — Página de equipa docente responsável por cada turma.
- **P2** — Newsletter / subscrição de email para novos artigos.
- **P2** — Partilha social por artigo (Facebook / WhatsApp).
- **P2** — Estatísticas de impacto (horas de voluntariado, pessoas apoiadas) por turma.
- **P2** — SEO: sitemap.xml, OpenGraph tags dinâmicas por post.
