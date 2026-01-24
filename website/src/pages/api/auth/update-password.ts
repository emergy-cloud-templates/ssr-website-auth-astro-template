import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const password = formData.get('password')?.toString();

  if (!password) {
    return new Response(
      JSON.stringify({ error: 'Password is required' }),
      { status: 400 }
    );
  }

  const supabase = createServerClient(cookies);
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
};
