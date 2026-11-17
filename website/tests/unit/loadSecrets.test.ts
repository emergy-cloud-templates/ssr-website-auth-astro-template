import { beforeEach, describe, expect, it, vi } from "vitest";

const secretsSend = vi.fn();
const ssmSend = vi.fn();

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: class {
    send = secretsSend;
  },
  GetSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send = ssmSend;
  },
  GetParameterCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { loadSecrets, resetLoadSecretsForTests } from "../../ssr/loadSecrets";

const KEYS = ["A", "B", "C", "FROM_FN"];

beforeEach(() => {
  resetLoadSecretsForTests();
  secretsSend.mockReset();
  ssmSend.mockReset();
  for (const key of KEYS) delete process.env[key];
  vi.stubEnv("ENV", "prod");
  vi.stubEnv("APP_SECRETS_ID", "prod/p");
  vi.stubEnv("PLATFORM_CONFIG_PARAM", "/emergy/p/prod");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("loadSecrets", () => {
  it("merges the own secret over the platform config, and the function env over both", async () => {
    process.env.FROM_FN = "fn";
    secretsSend.mockResolvedValue({ SecretString: JSON.stringify({ A: "own", FROM_FN: "own" }) });
    ssmSend.mockResolvedValue({ Parameter: { Value: JSON.stringify({ A: "platform", B: "platform", FROM_FN: "p" }) } });
    await loadSecrets();
    expect(process.env.A).toBe("own");
    expect(process.env.B).toBe("platform");
    expect(process.env.FROM_FN).toBe("fn");
    const command = ssmSend.mock.calls[0]![0] as { input: { Name: string; WithDecryption: boolean } };
    expect(command.input).toEqual({ Name: "/emergy/p/prod", WithDecryption: true });
  });

  it("works with no own secret when the platform config exists", async () => {
    secretsSend.mockRejectedValue(new Error("ResourceNotFoundException"));
    ssmSend.mockResolvedValue({ Parameter: { Value: JSON.stringify({ B: "platform" }) } });
    await loadSecrets();
    expect(process.env.B).toBe("platform");
  });

  it("is fail-soft when the platform config is missing or malformed, and never logs its value", async () => {
    secretsSend.mockResolvedValue({ SecretString: JSON.stringify({ A: "own" }) });
    ssmSend.mockResolvedValue({ Parameter: { Value: "not json SENTINEL_VALUE" } });
    await loadSecrets();
    expect(process.env.A).toBe("own");
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("SENTINEL_VALUE");
  });

  it("reads nothing without the variables or in local mode, and once per container", async () => {
    vi.stubEnv("ENV", "local");
    await loadSecrets();
    expect(secretsSend).not.toHaveBeenCalled();
    expect(ssmSend).not.toHaveBeenCalled();

    resetLoadSecretsForTests();
    vi.stubEnv("ENV", "prod");
    vi.stubEnv("PLATFORM_CONFIG_PARAM", "");
    secretsSend.mockResolvedValue({ SecretString: "{}" });
    await loadSecrets();
    await loadSecrets();
    expect(ssmSend).not.toHaveBeenCalled();
    expect(secretsSend).toHaveBeenCalledTimes(1);
  });
});
