import { useState } from 'preact/hooks';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
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

    try {
      const response = await fetch('/api/account/update-profile', { method: 'POST', body: formData });
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

  return (
    <form class="space-y-6" onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message="Profile updated successfully!" />}
      <Input id="name" name="name" type="text" label="Full name" value={initialName} autocomplete="name" required />
      <Input id="email" name="email" type="email" label="Email address" value={email} disabled />
      <div class="flex justify-end">
        <Button type="submit" loading={loading} class="w-auto">Save changes</Button>
      </div>
    </form>
  );
}
