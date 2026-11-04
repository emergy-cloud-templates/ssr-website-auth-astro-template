// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16), glue/auth.ts. Owned by this project.
// The one file that wires the auth lego to Astro and the Supabase SDK: everything else is in ~/lib/supabase-auth.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSecret } from "astro:env/server";

import * as rules from "~/components/auth-forms/validation";
import { siteConfig } from "~/config/site";
import { createAuthKit } from "~/lib/supabase-auth";

/** Pages that require a signed-in user. Add your own app sections here. */
export const PROTECTED_ROUTES = ["/dashboard", "/account"];

export const auth = createAuthKit({
  env: (key) => getSecret(key),
  supabase: { createServerClient, createClient },
  rules,
  appName: siteConfig.name,
  routes: { protected: PROTECTED_ROUTES, home: "/dashboard" },
  // Delete your own application data for this user here, before the auth account goes (see docs/customization.md).
  // onDeleteAccount: async (user) => { ... },
});
