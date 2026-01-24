import { useState } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function UpdatePasswordForm() {
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
      const response = await fetch('/api/auth/update-password', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = '/account'; }, 2000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <Alert type="success" message="Password updated successfully! Redirecting..." />;
  }

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      <Input id="password" name="password" type="password" label="New password" autocomplete="new-password" minLength={8} required />
      <Input id="confirmPassword" name="confirmPassword" type="password" label="Confirm new password" autocomplete="new-password" minLength={8} required />
      <Button type="submit" loading={loading}>Update password</Button>
    </form>
  );
}
