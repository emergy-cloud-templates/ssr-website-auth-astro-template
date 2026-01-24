import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

function sanitizeName(name: string): string {
  // Remove any HTML tags and trim
  return name.replace(/<[^>]*>/g, '').trim().slice(0, 100);
}

export const POST: APIRoute = async ({ request, url, cookies }) => {
  try {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString()?.trim().toLowerCase();
    const password = formData.get('password')?.toString();

    // Validation
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return new Response(
        JSON.stringify({ error: passwordCheck.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedName = sanitizeName(name);
    if (sanitizedName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient(cookies);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: sanitizedName },
        emailRedirectTo: `${url.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Sign up error:', error.message);
      // Generic message to prevent user enumeration
      return new Response(
        JSON.stringify({ error: 'Unable to create account. Please try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected sign up error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
