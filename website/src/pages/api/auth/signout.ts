import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = createServerClient(cookies);
  await supabase.auth.signOut();
  return redirect('/auth/signin');
};
