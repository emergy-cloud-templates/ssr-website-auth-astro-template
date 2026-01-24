import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const confirmation = formData.get('confirmation')?.toString();
  const password = formData.get('password')?.toString();

  if (confirmation !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Please type DELETE to confirm' }),
      { status: 400 }
    );
  }

  if (!password) {
    return new Response(
      JSON.stringify({ error: 'Password is required' }),
      { status: 400 }
    );
  }

  const supabase = createServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return new Response(
      JSON.stringify({ error: 'Not authenticated' }),
      { status: 401 }
    );
  }

  // Verify password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (signInError) {
    return new Response(
      JSON.stringify({ error: 'Password is incorrect' }),
      { status: 400 }
    );
  }

  await supabase.auth.signOut();
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
};
