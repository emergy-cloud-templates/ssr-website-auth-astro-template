# Customization

## Rename the product

`website/src/config/site.ts` holds the name and description used by page
titles, the sidebar, the auth pages and the local provider's emails. Replace
`website/public/favicon.svg` and adjust the colors (Tailwind classes, the
template uses `indigo-*` as its accent).

Also update `name` / `description` / `repository` in `website/package.json`.

## Add a protected page

1. Create the page with the dashboard layout:

   ```astro
   ---
   // website/src/pages/projects/index.astro
   import DashboardLayout from "../../layouts/DashboardLayout.astro";

   const user = Astro.locals.user!; // guaranteed by the middleware
   ---

   <DashboardLayout title="Projects" pageTitle="Projects">
     <p>Projects of {user.email}</p>
   </DashboardLayout>
   ```

2. Protect the path in `website/src/lib/auth.ts`:

   ```ts
   export const PROTECTED_ROUTES = ["/dashboard", "/account", "/projects"];
   ```

3. Add it to the sidebar (`NAV` in `website/src/layouts/DashboardLayout.astro`;
   icons by name, see `src/components/app-shell/icons.tsx`).
4. Add a Playwright step that opens it (`tests/e2e/`).

## Add an API route

Wrap it in `defineRoute` (`website/src/lib/route.ts`, the api-route lego): it
checks the auth level, answers `{ "error": ... }` for you and logs unexpected
errors (a generic 500 with a `trace_id`; internals never reach the browser).

```ts
// website/src/pages/api/projects/create.ts
import { badRequest, field, json, readForm } from "~/lib/api-route";
import { defineRoute } from "~/lib/route";

export const POST = defineRoute({ name: "/api/projects/create", auth: "user" }, async (ctx) => {
  const form = await readForm(ctx.request);
  const name = form ? field(form, "name").trim() : "";
  if (!name) throw badRequest("Name is required.");

  // ... your logic: ctx.user is the signed-in user (never null on a "user" route)
  return json({ ok: true });
});
```

- `auth`: `"user"` (signed in), `"admin"`, `"public"`, or `"apiKey"` (a shared
  secret, for webhooks).
- Validate on the server even if the form validates too (`parseWith(schema,
  await readBody(ctx.request))` takes a zod schema; `text`, `integer`, `email`
  for simple fields).
- Return JSON; the `useFormAction` hook (`src/components/auth-forms/api.ts`)
  shows `error` messages and calls `onSuccess` with the body.
- Form posts are protected from cross-site requests by Astro's origin check.
  If you add a JSON API for other origins, handle CORS and authentication
  explicitly.

## Store data for each user (Supabase)

Use Postgres tables with **row level security**, queried with the request's
Supabase client so the policies see the signed-in user:

```sql
-- supabase/migrations/<timestamp>_projects.sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users manage their own projects" on public.projects
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

```ts
// in a page or API route
const supabase = Astro.locals.auth.supabase; // undefined in local mode
const { data, error } = await supabase!.from("projects").select("id, name").order("created_at");
```

`on delete cascade` removes a user's rows when the account is deleted. With
the local auth provider there is no database for your own tables: either
develop data features against the Supabase CLI stack
([Local development](local-development.md#supabase-cli-local-stack-in-docker)),
or add your own storage behind an interface the way `src/lib/supabase-auth` does.

## Clean up on account deletion

`onDeleteAccount` in `website/src/lib/auth.ts` marks the spot: delete or
anonymize data that is not covered by a database cascade (files in storage,
records in third-party services) there; it runs before the auth account is
deleted.

## Emails that work across devices

Supabase's default email links use the PKCE flow: the link must be opened in
the browser that asked for it (it holds a verifier cookie). To make links work
on any device, edit the templates in **Authentication > Emails** so they point
at the callback with a token hash:

| Template | Link |
| --- | --- |
| Confirm signup | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` |
| Reset password | `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery` |

`{{ .RedirectTo }}` already contains `/auth/callback?next=...`, so the
callback verifies the token and continues to the right page. Do the same in
`website/supabase/config.toml` (`[auth.email.template.*]`) for the local stack.

## Change the password policy

`website/src/components/auth-forms/validation.ts` (`validatePassword`,
`PASSWORD_HINT`) is used by the forms and the API (`src/lib/auth.ts` passes it
to the auth routes). Keep Supabase's own setting (Authentication >
Providers > Email > password requirements, and `website/supabase/config.toml`)
at least as strict.

## Add another auth backend

Implement `AuthService` (`website/src/lib/supabase-auth/types.ts`; the local
provider in `src/lib/supabase-auth/local/provider.ts` is a complete example) and
return it from your own `createAuth`. Pages, API routes and the middleware do
not change.

## Cache public pages at the edge

CloudFront caches nothing from the Lambda by default. For a public page that
is the same for every visitor, send a cache header:

```astro
---
Astro.response.headers.set("Cache-Control", "public, s-maxage=300");
---
```

Never do this on pages that read `Astro.locals.user` (the middleware already
marks signed-in responses `private, no-store`).
