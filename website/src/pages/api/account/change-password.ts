import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const currentPassword = formData.get('currentPassword')?.toString();
  const newPassword = formData.get('newPassword')?.toString();

  if (!currentPassword || !newPassword) {
    return new Response(
      JSON.stringify({ error: 'All fields are required' }),
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

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return new Response(
      JSON.stringify({ error: 'Current password is incorrect' }),
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

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
