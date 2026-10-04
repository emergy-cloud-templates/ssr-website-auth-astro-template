import { describe, expect, it } from "vitest";

import { ConfigError, resolveConfig } from "~/lib/config";

const env = (values: Record<string, string>) => (key: string) => values[key];

describe("resolveConfig", () => {
  it("defaults to the local provider when Supabase is not configured", () => {
    const config = resolveConfig(env({}));
    expect(config.authProvider).toBe("local");
    expect(config.supabase).toBeNull();
    expect(config.local).toEqual({ dbPath: ".data/local-auth.sqlite", requireEmailConfirmation: false });
  });

  it("picks Supabase when the URL and key are set", () => {
    const config = resolveConfig(
      env({ PUBLIC_SUPABASE_URL: "https://abc.supabase.co", PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" }),
    );
    expect(config.authProvider).toBe("supabase");
    expect(config.supabase).toEqual({
      url: "https://abc.supabase.co",
      publishableKey: "sb_publishable_x",
      secretKey: undefined,
    });
  });

  it("accepts the legacy anon / service_role key names", () => {
    const config = resolveConfig(
      env({
        PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      }),
    );
    expect(config.supabase).toMatchObject({ publishableKey: "anon", secretKey: "service" });
  });

  it("lets AUTH_PROVIDER force the local provider", () => {
    const config = resolveConfig(
      env({ AUTH_PROVIDER: "local", PUBLIC_SUPABASE_URL: "https://abc.supabase.co", PUBLIC_SUPABASE_ANON_KEY: "k" }),
    );
    expect(config.authProvider).toBe("local");
  });

  it("rejects AUTH_PROVIDER=supabase without credentials", () => {
    expect(() => resolveConfig(env({ AUTH_PROVIDER: "supabase" }))).toThrow(ConfigError);
  });

  it("rejects unknown providers", () => {
    expect(() => resolveConfig(env({ AUTH_PROVIDER: "firebase" }))).toThrow(/AUTH_PROVIDER/);
  });

  it("refuses the local provider on AWS Lambda", () => {
    expect(() => resolveConfig(env({ AWS_LAMBDA_FUNCTION_NAME: "fn" }))).toThrow(/cannot run on AWS Lambda/);
  });

  it("normalizes SITE_URL to an origin and validates it", () => {
    expect(resolveConfig(env({ SITE_URL: "https://www.example.com/some/path" })).siteUrl).toBe(
      "https://www.example.com",
    );
    expect(() => resolveConfig(env({ SITE_URL: "not a url" }))).toThrow(/SITE_URL/);
  });

  it("reads the local provider options", () => {
    const config = resolveConfig(
      env({ LOCAL_AUTH_DB_PATH: "/tmp/x.sqlite", LOCAL_AUTH_REQUIRE_EMAIL_CONFIRMATION: "true" }),
    );
    expect(config.local).toEqual({ dbPath: "/tmp/x.sqlite", requireEmailConfirmation: true });
  });

  it("ignores blank values", () => {
    expect(resolveConfig(env({ PUBLIC_SUPABASE_URL: "  ", PUBLIC_SUPABASE_ANON_KEY: "k" })).authProvider).toBe("local");
  });
});
