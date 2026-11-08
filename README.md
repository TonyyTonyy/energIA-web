# EnergIA — protótipo

Protótipo front-end de um sistema de IA que controla ar-condicionado e iluminação de salas de aula de uma faculdade para reduzir o desperdício de energia. É 100% front-end, com dados mockados (sem backend, banco ou autenticação). Interface em pt-BR.

**Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, next-themes, lucide-react, recharts, date-fns, sonner.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000 (redireciona para `/dashboard`). Para validar: `npm run build` e `npm run lint`.

## Estrutura

```
src/
├─ app/
│  ├─ layout.tsx, globals.css, page.tsx
│  └─ (app)/                 # shell (sidebar + header) e telas
│     ├─ dashboard/  salas/  salas/[id]/  agenda/
│     └─ decisoes-ia/  simulador/  economia/  assistente/  configuracoes/
├─ components/
│  ├─ ui/                    # shadcn/ui
│  ├─ layout/                # theme, sidebar, header, page-header
│  └─ shared/ dashboard/ rooms/ schedule/ ai/ simulator/ savings/ assistant/ settings/
├─ data/                     # dados mockados
├─ hooks/                    # use-mounted
├─ lib/                      # utils (cn), constants, format
└─ types/                    # tipos de domínio
```

## Convenções

- Dados mockados em `src/data`, tipos em `src/types`.
- Arquivos em kebab-case; componentes com named export em PascalCase.
- Cores semânticas de status (`success`, `warning`, `danger`, `info`) disponíveis no Tailwind (ex.: `bg-success`, `text-warning`).
