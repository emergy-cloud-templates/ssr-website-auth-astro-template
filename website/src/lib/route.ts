// The app's API route wrapper (the api-route lego): auth level, the `{ error }` answer, logging, in one place.
//
//   export const POST = defineRoute({ name: "/api/projects/create", auth: "user" }, async (ctx) => {
//     ...ctx.user is the signed-in user...
//     return json({ ok: true });
//   });
import { createDefineRoute } from "~/lib/api-route";
import type { AuthUser } from "~/lib/supabase-auth";

export const defineRoute = createDefineRoute<AuthUser>({
  getUser: ({ locals }) => (locals as App.Locals).user,
  // Supabase app_metadata.role (only the server can set it); the local provider has no roles.
  isAdmin: (user) => user.role === "admin",
});
