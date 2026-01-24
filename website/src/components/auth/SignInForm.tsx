import { useState, useRef } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSubmitRef = useRef<number>(0);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    // Simple throttle - prevent rapid submissions
    const now = Date.now();
    if (now - lastSubmitRef.current < 1000) {
      return;
    }
    lastSubmitRef.current = now;

    setLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Client-side validation
    const email = formData.get('email')?.toString()?.trim();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      <Input id="email" name="email" type="email" label="Email address" autocomplete="email" required />
      <Input id="password" name="password" type="password" label="Password" autocomplete="current-password" required />
      <div class="text-sm">
        <a href="/auth/reset-password" class="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">Forgot your password?</a>
      </div>
      <Button type="submit" loading={loading}>Sign in</Button>
    </form>
  );
}
