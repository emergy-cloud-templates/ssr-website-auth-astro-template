import type { CookieJar, CookieOptions } from "~/lib/auth/types";

/** In-memory cookie jar that behaves like a browser round-trip between calls. */
export class MemoryCookieJar implements CookieJar {
  readonly store = new Map<string, { value: string; options: CookieOptions }>();

  getAll() {
    return [...this.store].map(([name, { value }]) => ({ name, value }));
  }
  get(name: string) {
    return this.store.get(name)?.value;
  }
  set(name: string, value: string, options: CookieOptions) {
    if (value === "" || options.maxAge === 0) this.store.delete(name);
    else this.store.set(name, { value, options });
  }
  delete(name: string) {
    this.store.delete(name);
  }
}

export function formRequest(url: string, fields: Record<string, string>): Request {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request(url, { method: "POST", body });
}
