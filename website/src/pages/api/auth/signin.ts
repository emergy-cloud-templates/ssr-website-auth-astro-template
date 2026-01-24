import type { APIRoute } from "astro";
import { createServerClient } from "../../../lib/supabase";
import "dotenv/config";

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString()?.trim().toLowerCase();
    const password = formData.get("password")?.toString();

    // Validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createServerClient(cookies);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Don't expose specific error messages to prevent user enumeration
      console.error("Sign in error:", error.message);
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // The SSR client should have set cookies via setAll, but let's verify
    console.log("Sign in successful for:", data.user?.email);

    return new Response(
      JSON.stringify({ success: true, user: { email: data.user?.email } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected sign in error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};