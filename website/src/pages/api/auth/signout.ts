import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, redirect }) => {
  try {
    await locals.auth.signOut();
  } catch (error) {
    // Signing out must always succeed from the user's point of view.
    console.error("[signout]", error);
  }
  return redirect("/", 303);
};
