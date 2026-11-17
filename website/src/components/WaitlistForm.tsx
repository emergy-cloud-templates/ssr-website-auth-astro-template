import { useState } from "preact/hooks";

import { useFormAction } from "~/components/auth-forms";
import { Alert, Button, Input } from "~/components/ui";

/** Email sign-up: POSTs to /api/waitlist. The hidden `website` field is the honeypot (bots fill it, people do not). */
export function WaitlistForm({ source = "home" }: { source?: string }) {
  const [done, setDone] = useState(false);
  const { loading, error, onSubmit } = useFormAction("/api/waitlist", { onSuccess: () => setDone(true) });

  if (done) return <Alert type="success">Thanks! Check your inbox to confirm your email address.</Alert>;

  return (
    <form class="mx-auto flex max-w-md flex-col gap-3 text-left" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <Input id="waitlist-email" name="email" type="email" label="Email" autocomplete="email" required />
      <div class="hidden" aria-hidden="true">
        <input type="text" name="website" tabindex={-1} autocomplete="off" />
      </div>
      <input type="hidden" name="source" value={source} />
      <Button type="submit" loading={loading} fullWidth>
        Join the waitlist
      </Button>
    </form>
  );
}
