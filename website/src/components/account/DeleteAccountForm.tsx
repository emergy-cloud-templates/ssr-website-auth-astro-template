import { useState } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function DeleteAccountForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/account/delete', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <div class="space-y-4">
        <p class="text-sm text-gray-600">Once you delete your account, there is no going back. Please be certain.</p>
        <Button type="button" variant="danger" class="w-auto" onClick={() => setShowConfirm(true)}>Delete account</Button>
      </div>
    );
  }

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      <Alert type="error" message="This action cannot be undone. This will permanently delete your account." />
      <Input id="confirmation" name="confirmation" type="text" label='Type "DELETE" to confirm' placeholder="DELETE" required pattern="DELETE" />
      <Input id="password" name="password" type="password" label="Enter your password" autocomplete="current-password" required />
      <div class="flex gap-3 justify-end">
        <Button type="button" variant="secondary" class="w-auto" onClick={() => setShowConfirm(false)}>Cancel</Button>
        <Button type="submit" variant="danger" loading={loading} class="w-auto">Permanently delete</Button>
      </div>
    </form>
  );
}
