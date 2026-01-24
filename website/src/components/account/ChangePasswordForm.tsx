import { useState } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/account/change-password', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }
      setSuccess(true);
      form.reset();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message="Password changed successfully!" />}
      <Input id="currentPassword" name="currentPassword" type="password" label="Current password" autocomplete="current-password" required />
      <Input id="newPassword" name="newPassword" type="password" label="New password" autocomplete="new-password" minLength={8} required />
      <Input id="confirmPassword" name="confirmPassword" type="password" label="Confirm new password" autocomplete="new-password" minLength={8} required />
      <div class="flex justify-end">
        <Button type="submit" loading={loading} class="w-auto">Change password</Button>
      </div>
    </form>
  );
}
