import type { APIRoute } from "astro";
import { createServerClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  if (code) {
    const supabase = createServerClient(cookies);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirect(next);
    }

    console.error("Auth callback error:", error.message);
  }

  return redirect("/auth/signin?error=auth_callback_error");
};