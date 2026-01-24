import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, url }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${url.origin}/auth/update-password`,
  });

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
