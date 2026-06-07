# InterV Frontend Project Rules

These instructions apply to everything inside `frontend/`. Follow them for all
code changes unless a more specific `AGENT.md` exists in a subdirectory.

## Project Overview

InterV is a Next.js App Router application for AI interview practice. It uses
React, TypeScript, Tailwind CSS v4, shadcn/Radix UI primitives, Solar Icons,
Axios, Zustand, Mongoose, PayOS, Nodemailer, and Three.js.

Keep route handlers, server-only database/email/payment logic, client services,
React UI, shared types, and design tokens separate.

## Non-Negotiable Rules

- Keep TypeScript strict. Do not introduce `any`, `@ts-ignore`, unchecked
  casts, or broad eslint disables when the value can be typed or validated.
- Keep changes scoped to the requested behavior. Do not refactor unrelated code.
- Reuse existing components, utilities, services, types, and route patterns
  before adding new abstractions.
- Do not edit generated output in `.next/`, `out/`, or `node_modules/`.
- Do not access Mongoose, PayOS, Nodemailer, JWT secrets, or server-only
  environment variables from client components.
- Do not place business logic inside `app/components/ui/`.
- Use the `@/app/...` alias for imports across app directories. Relative
  imports are acceptable for siblings in the same module.
- Avoid circular dependencies and reverse imports from shared directories into
  route-specific code.
- Directory `index.ts` files are barrel files only. Do not put declarations,
  constants, functions, classes, side effects, or business logic in them.
- Preserve existing route group behavior: `(main)` is the authenticated app
  shell and `(bare)` is for auth/settings/credit/profile pages without the main
  sidebar shell.

## Directory Responsibilities

```text
frontend/
|-- app/
|   |-- (bare)/              Public or standalone route pages
|   |-- (main)/              Main authenticated application routes
|   |-- api/                 Next route handlers and server endpoints
|   |-- assets/              Imported images, logos, shaders, and static data
|   |-- components/
|   |   |-- common/          App-aware reusable UI and feature components
|   |   |-- layouts/         Shared layout shells
|   |   |-- ui/              shadcn/Radix primitives only
|   |-- contants/            Existing shared constants barrel
|   |-- contexts/            React providers and contexts
|   |-- hooks/               Reusable client hooks
|   |-- i18n/                Locale dictionaries and translation wiring
|   |-- lib/                 Framework-light utilities and server/client helpers
|   |-- models/              Mongoose schemas and model exports
|   |-- pages/               Page-level React compositions used by routes
|   |-- scripts/             Small browser scripts used by app rendering
|   |-- services/            Client-side API service adapters
|   |-- stores/              Zustand stores and persisted client state
|   |-- types/               Shared TypeScript interfaces and type helpers
|-- loaders/                 Build loaders, including GLSL loader
|-- public/                  Static files served as-is
```

### `app/api/`

- Route handlers must validate request bodies, params, cookies, and external
  responses before trusting them.
- Keep authentication checks and database writes explicit in the handler or a
  server-only helper imported by the handler.
- Return `NextResponse.json(...)` with consistent error shapes.
- Use `unknown` in `catch` blocks, then convert with shared error helpers.
- Do not import client hooks, client contexts, React components, or browser-only
  services from route handlers.

### `app/models/`

- Store Mongoose schemas and model exports only.
- Models may import shared Mongoose document types from `app/types/`.
- Guard model creation for hot reload without deleting unrelated model state.

### `app/lib/`

- Store small utilities, API client setup, auth helpers, database connection,
  email helpers, and payment setup.
- `ConnectDB.ts`, `Auth.ts`, `Email.ts`, and `PayOS.ts` are server-only in
  practice. Do not import them into client components.
- Put reusable error parsing, formatting, and deterministic helpers here.
- Prefer importing reusable utilities from `@/app/lib/Utils`.

### `app/services/`

- Store browser-side service adapters that call the local API through the Axios
  client in `app/lib/Client.ts`.
- Services must not import Mongoose models, server secrets, Nodemailer, PayOS,
  or route handlers.
- Keep service methods typed with shared request/response interfaces.

### `app/components/ui/`

- Store generic shadcn/Radix primitives only.
- Preserve primitive APIs, accessibility behavior, `data-slot` attributes, and
  styling conventions when modifying generated components.
- Do not import stores, services, route pages, Mongoose models, or app-specific
  workflows here.

### `app/components/common/`

- Store reusable application-aware components shared by routes or page modules.
- Common components may compose `app/components/ui/` primitives and client
  services, but should not import route handlers or Mongoose models.
- Feature subfolders such as `PracticePage/`, `LandingPage/`, `Dialog/`, and
  `Drawer/` own feature-local components.

### `app/components/layouts/`

- Store structural shells such as sidebar and bare layouts.
- Layouts coordinate presentation and navigation, not database, payment, or
  authentication business rules.

### `app/pages/`

- Store page-level UI compositions consumed by App Router route files.
- Keep route files in `(main)` and `(bare)` thin; they should delegate UI to
  these page components where that is the existing pattern.

### `app/hooks/` and `app/contexts/`

- Hooks must start with `use` and may use browser APIs only in client modules.
- Keep effects for synchronization, subscriptions, timers, and external
  systems. Do not use effects for state that can be derived during render.
- Context providers should expose narrow, typed values and avoid leaking raw API
  client details.

### `app/stores/`

- Store cross-component client state only when local state is insufficient.
- Persisted stores may use `localStorage` through Zustand storage helpers.
- Stores must not import server-only modules.

### `app/types/`

- Store shared interfaces, domain types, and reusable type helpers.
- Keep runtime logic out of this directory.
- Prefer colocated types when a type is used by only one component or helper.

### `app/assets/` and `public/`

- Use `app/assets/` for imported and bundled logos, images, shaders, and JSON
  assets.
- Use `public/` for files that must keep their filename and are referenced by
  root URLs such as `/icon-dark.png`.
- Export commonly reused imported assets from `app/assets/index.ts`.

### `loaders/`

- Keep build loaders small and deterministic.
- The GLSL loader must return JavaScript modules that export shader source
  strings.

## Dependency Direction

Follow this general dependency direction:

```text
route files
  -> pages
  -> layouts / common components / ui / hooks / contexts
  -> services / stores
  -> lib / constants / types / assets

api route handlers
  -> lib server helpers / models / types / constants

models
  -> types
```

- Shared UI directories must not import from route groups.
- Server-only helpers must not import browser-only components, hooks, contexts,
  or stores.
- Client components must communicate with server capabilities through typed API
  services.

## React And UI Rules

- Use functional React components and composition.
- Prefer named exports for utilities and services. Preserve existing default
  exports for page and component modules unless changing the call sites.
- Use existing `app/components/ui/` primitives before creating new base UI.
- Keep component props typed and close to the component when not shared.
- Preserve keyboard interaction, focus states, semantic HTML, accessible labels,
  and loading/disabled states.
- Use Tailwind CSS and theme tokens from `app/globals.css`.
- Use `cn()` from `@/app/lib/Utils` for conditional class composition.
- Use `next/image` for meaningful images when optimization is practical. Plain
  `<img>` is acceptable for user-provided data URLs or cases where Next image
  optimization is not appropriate.
- Use Three.js for shader/canvas experiences and verify the canvas is nonblank
  when making visual changes.

## Font And Theme Rules

- Use `next/font/google` in `app/layout.tsx` for Google fonts. Do not add remote
  `@import` font URLs in `app/globals.css`.
- InterV uses Inter for the main sans font, Geist Mono for monospace,
  Merriweather Sans for `.font-logo`, and Merriweather for `.font-question`.
- Expose font variables from the root layout and map them in Tailwind theme
  tokens.
- Keep light/dark colors in CSS variables. Prefer semantic Tailwind tokens such
  as `bg-background`, `text-foreground`, `text-muted-foreground`,
  `border-border`, and `text-primary` over hardcoded colors.
- Preserve `themeInitializerScript` so the initial theme is applied before
  hydration.

## Icon Policy

The Solar React package/import path is `@solar-icons/react`.

- Application, feature, navigation, and common action icons should come from
  `@solar-icons/react` when a matching Solar icon exists.
- Use `weight="BoldDuotone"` for Solar icons in application UI unless an
  existing primitive API requires a different presentation.
- `X`, `Check`, and other primitive glyphs may use `lucide-react` inside
  shadcn/Radix UI primitives or where the current UI already expects lucide.
- Keep `"iconLibrary": "lucide"` in `components.json` so generated shadcn
  primitives remain consistent.
- Do not use inline SVG for ordinary interface icons. Inline SVG is allowed for
  branding, custom artwork, or icons unavailable in the installed libraries.
- Prefer named icon imports. Do not import an entire icon library namespace.
- Decorative icons must use `aria-hidden="true"`. Icon-only interactive controls
  must have an accessible name through `aria-label` or visible text.

## API, Data, And Auth Rules

- Database access runs through Mongoose in server route handlers or server-only
  helpers.
- Never expose JWT secrets, SMTP credentials, PayOS keys, database URIs, or raw
  database documents to client code.
- Use `verifyAccessToken` and cookie helpers from `app/lib/Auth.ts` for
  authenticated route handlers.
- Keep password hashing, PIN generation, session revocation, and payment
  verification on the server.
- Normalize API errors before showing them in UI.
- Keep Axios refresh/retry behavior centralized in `app/lib/Client.ts`.

## TypeScript And Naming Rules

- React component files use `PascalCase.tsx`, except generated shadcn UI files
  in `app/components/ui/`, which keep their lowercase names.
- Application TypeScript files use `PascalCase.ts` where practical, except
  `index.ts`, hooks, generated UI files, framework files, and established local
  convention files.
- Components and types use `PascalCase`.
- Functions and variables use `camelCase`.
- Hooks use `useCamelCase`.
- Use `UPPER_SNAKE_CASE` only for true constants.
- Use `unknown` plus validation for untrusted values and caught errors.
- Handle expected errors explicitly; do not silently swallow failures.

## Internationalization

- Keep user-facing copy in `app/i18n/*.json` when the feature already uses
  translations.
- Maintain matching keys across `en.json`, `vi.json`, and `zh.json`.
- Use typed translation keys or narrow helper functions where practical.

## Verification

Before finishing a code change:

1. Run `npm run lint`.
2. Run `npm run build` when the change affects TypeScript, routes, assets,
   loaders, API handlers, or package/build config.
3. Manually verify the relevant page or interaction when automated coverage
   does not exist.
4. Report any verification command that could not run or any pre-existing
   failure that blocks verification.
