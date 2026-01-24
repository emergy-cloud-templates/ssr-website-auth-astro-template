import { useState } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <Alert type="success" message="Check your email for a confirmation link to complete your registration." />;
  }

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      <Input id="name" name="name" type="text" label="Full name" autocomplete="name" required />
      <Input id="email" name="email" type="email" label="Email address" autocomplete="email" required />
      <Input id="password" name="password" type="password" label="Password" autocomplete="new-password" minLength={8} required />
      <Input id="confirmPassword" name="confirmPassword" type="password" label="Confirm password" autocomplete="new-password" minLength={8} required />
      <Button type="submit" loading={loading}>Sign up</Button>
    </form>
  );
}
