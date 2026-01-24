import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const name = formData.get('name')?.toString();

  if (!name) {
    return new Response(
      JSON.stringify({ error: 'Name is required' }),
      { status: 400 }
    );
  }

  const supabase = createServerClient(cookies);
  const { error } = await supabase.auth.updateUser({ data: { name } });

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
