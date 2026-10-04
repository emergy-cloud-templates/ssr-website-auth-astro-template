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

2. Protect the path in `website/src/lib/routes.ts`:

   ```ts
   export const PROTECTED_ROUTES = ["/dashboard", "/account", "/projects"];
   ```

3. Add it to the sidebar (`NAV_ITEMS` in
   `website/src/components/dashboard/Sidebar.tsx`).
4. Add a case to `tests/unit/routes.test.ts`.

## Add an API route

Follow the existing routes in `website/src/pages/api/`:

```ts
// website/src/pages/api/projects/create.ts
import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);
  const name = field(form, "name").trim();
  if (!name) return jsonError("Name is required.", 400);

  try {
    // ... your logic
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error); // logs, returns a generic 500
  }
};
```

- Validate on the server even if the form validates too.
- Return JSON; the `useFormAction` hook (`src/lib/client/useFormAction.ts`)
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
or add your own storage behind an interface the way `src/lib/auth` does.

## Clean up on account deletion

`website/src/pages/api/account/delete.ts` marks the spot: delete or anonymize
data that is not covered by a database cascade (files in storage, records in
third-party services) before calling `locals.auth.deleteAccount()`.

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

`website/src/lib/validation.ts` (`validatePassword`, `PASSWORD_HINT`) is used
by the forms and the API. Keep Supabase's own setting (Authentication >
Providers > Email > password requirements, and `website/supabase/config.toml`)
at least as strict, and update `tests/unit/validation.test.ts`.

## Add another auth backend

Implement `AuthService` (`website/src/lib/auth/types.ts`) in
`src/lib/auth/<name>.ts`, return it from `createAuth` in
`src/lib/auth/index.ts` based on `AUTH_PROVIDER`, and copy the provider tests.
Pages, API routes and the middleware do not change.

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
