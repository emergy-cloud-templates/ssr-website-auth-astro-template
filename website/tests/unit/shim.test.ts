import { describe, expect, it } from "vitest";

import { createRequest, createResponse, isFromTrustedOrigin } from "../../ssr/shim.js";

const baseEvent = {
  httpMethod: "GET",
  path: "/dashboard",
  multiValueHeaders: {
    Host: ["abc.execute-api.us-east-1.amazonaws.com"],
    "X-Viewer-Host": ["www.example.com"],
    "X-Origin-Verify": ["secret"],
    Accept: ["text/html", "application/json"],
  },
  requestContext: { identity: { sourceIp: "203.0.113.1" } },
};

async function readBody(request: AsyncIterable<Buffer>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

describe("createRequest", () => {
  it("restores the viewer host, lowercases headers and drops the origin secret", () => {
    const request = createRequest(baseEvent);
    expect(request.headers.host).toBe("www.example.com");
    expect(request.headers.accept).toEqual(["text/html", "application/json"]);
    expect(request.headers["x-origin-verify"]).toBeUndefined();
    expect(request.socket).toEqual({ encrypted: true, remoteAddress: "203.0.113.1" });
  });

  it("keeps repeated query parameters", () => {
    const request = createRequest({
      ...baseEvent,
      multiValueQueryStringParameters: { tag: ["a", "b"], q: ["x y"] },
    });
    expect(request.url).toBe("/dashboard?tag=a&tag=b&q=x+y");
  });

  it("falls back to single-value headers and query parameters", () => {
    const request = createRequest({
      httpMethod: "GET",
      path: "/",
      headers: { Host: "example.com" },
      queryStringParameters: { a: "1" },
    });
    expect(request.headers.host).toBe("example.com");
    expect(request.url).toBe("/?a=1");
  });

  it("streams a base64 body without exposing a body property", async () => {
    const request = createRequest({
      ...baseEvent,
      httpMethod: "POST",
      body: Buffer.from("email=a%40b.co").toString("base64"),
      isBase64Encoded: true,
    });
    expect("body" in request).toBe(false);
    expect(await readBody(request)).toBe("email=a%40b.co");
  });

  it("uses http when the proxy says so (local server)", () => {
    const request = createRequest({
      ...baseEvent,
      multiValueHeaders: { ...baseEvent.multiValueHeaders, "x-forwarded-proto": ["http"] },
    });
    expect(request.socket.encrypted).toBe(false);
  });
});

describe("createResponse", () => {
  it("collects text bodies and keeps multiple Set-Cookie headers", async () => {
    const { response, result } = createResponse(baseEvent);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": ["a=1", "b=2"] });
    response.write("<p>");
    response.end("hi</p>");
    expect(await result).toEqual({
      statusCode: 200,
      multiValueHeaders: { "content-type": ["text/html; charset=utf-8"], "set-cookie": ["a=1", "b=2"] },
      body: "<p>hi</p>",
      isBase64Encoded: false,
    });
  });

  it("base64-encodes binary bodies", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const { response, result } = createResponse(baseEvent);
    response.writeHead(200, "OK", { "content-type": "image/jpeg" });
    response.end(bytes);
    const { body, isBase64Encoded } = await result;
    expect(isBase64Encoded).toBe(true);
    expect(Buffer.from(body, "base64")).toEqual(bytes);
  });

  it("rejects when the stream is destroyed", async () => {
    const { response, result } = createResponse(baseEvent);
    response.destroy(new Error("boom"));
    await expect(result).rejects.toThrow("boom");
  });
});

describe("isFromTrustedOrigin", () => {
  it("accepts anything when no secret is configured", () => {
    expect(isFromTrustedOrigin({}, undefined)).toBe(true);
  });

  it("requires the exact secret otherwise", () => {
    expect(isFromTrustedOrigin({ "x-origin-verify": "secret" }, "secret")).toBe(true);
    expect(isFromTrustedOrigin({ "x-origin-verify": "secreT" }, "secret")).toBe(false);
    expect(isFromTrustedOrigin({ "x-origin-verify": "s" }, "secret")).toBe(false);
    expect(isFromTrustedOrigin({}, "secret")).toBe(false);
  });
});
