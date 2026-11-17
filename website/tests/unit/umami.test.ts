import { describe, expect, it } from "vitest";

import { umamiTag } from "../../src/lib/umami";

const reader = (env: Record<string, string>) => (key: string) => env[key];

describe("umamiTag", () => {
  it("returns the tag when both keys are set", () => {
    expect(
      umamiTag(
        reader({
          PUBLIC_UMAMI_WEBSITE_ID: "0b1c2d3e-0000-4000-8000-123456789abc",
          PUBLIC_UMAMI_SCRIPT_URL: "https://stats.example.com/script.js",
        }),
      ),
    ).toEqual({ src: "https://stats.example.com/script.js", websiteId: "0b1c2d3e-0000-4000-8000-123456789abc" });
  });

  it("returns null when a key is missing (dev and staging)", () => {
    expect(umamiTag(reader({}))).toBeNull();
    expect(umamiTag(reader({ PUBLIC_UMAMI_WEBSITE_ID: "abc" }))).toBeNull();
    expect(umamiTag(reader({ PUBLIC_UMAMI_SCRIPT_URL: "https://s.example.com/s.js" }))).toBeNull();
  });

  it("refuses a non-https script URL and a website id that is not a plain id", () => {
    expect(
      umamiTag(reader({ PUBLIC_UMAMI_WEBSITE_ID: "abc", PUBLIC_UMAMI_SCRIPT_URL: "http://s.example.com/s.js" })),
    ).toBeNull();
    expect(
      umamiTag(reader({ PUBLIC_UMAMI_WEBSITE_ID: 'a"b', PUBLIC_UMAMI_SCRIPT_URL: "https://s.example.com/s.js" })),
    ).toBeNull();
    expect(umamiTag(reader({ PUBLIC_UMAMI_WEBSITE_ID: "abc", PUBLIC_UMAMI_SCRIPT_URL: "not a url" }))).toBeNull();
  });
});
