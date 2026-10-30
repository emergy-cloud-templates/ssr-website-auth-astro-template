// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: recapify.app - website/src/components/auth/GoogleButton.tsx (6ab8a9b). Lego auth-forms.
import { authLabels, type AuthLabels } from "./labels";

/** "Continue with Google", then an "or" divider above the email form. The logo keeps Google's colours. */
export function GoogleButton({ href, labels }: { href: string; labels?: Partial<AuthLabels> }) {
  const t = authLabels(labels);
  return (
    <div class="space-y-6">
      <a
        href={href}
        class="flex min-h-11 w-full items-center justify-center gap-3 rounded-input border border-line-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-content transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" class="h-5 w-5">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        {t.continueWithGoogle}
      </a>
      <div class="flex items-center gap-3 text-xs text-content-muted" aria-hidden="true">
        <span class="h-px flex-1 bg-line" />
        {t.orWithEmail}
        <span class="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
