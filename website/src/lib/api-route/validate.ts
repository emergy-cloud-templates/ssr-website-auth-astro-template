// Adapted from /common/legos/node/api-route@1.0.0 (dvk-common 33220c4). Owned by this project.
// Validation for route input: run any Standard Schema (zod 3.24+, valibot, arktype) or zod-style `safeParse`
// schema, or the small checks below for projects without a schema library. Every failure is a 400 HttpError
// with a message the client can show. Lego api-route; adapt per project, see README.md.
import { badRequest } from "./http.ts";

interface StandardIssue {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
}
type StandardResult<T> = { value: T; issues?: undefined } | { issues: ReadonlyArray<StandardIssue> };
interface StandardSchemaLike<T> {
  "~standard": { validate: (value: unknown) => StandardResult<T> | Promise<StandardResult<T>> };
}
interface SafeParseLike<T> {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false; error: { issues: ReadonlyArray<StandardIssue> } };
}
export type Schema<T> = StandardSchemaLike<T> | SafeParseLike<T>;

function issueText(issue: StandardIssue | undefined): string {
  if (!issue) return "Invalid input.";
  const path = (issue.path ?? [])
    .map((p) => (typeof p === "object" && p !== null && "key" in p ? p.key : p))
    .map(String)
    .join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** The parsed value, or a 400 HttpError naming the first problem (`field: message`). */
export async function parseWith<T>(schema: Schema<T>, input: unknown): Promise<T> {
  if ("~standard" in schema) {
    const result = await schema["~standard"].validate(input);
    if (result.issues) throw badRequest(issueText(result.issues[0]), { issues: result.issues.length });
    return result.value;
  }
  const result = schema.safeParse(input);
  if (!result.success) throw badRequest(issueText(result.error.issues[0]), { issues: result.error.issues.length });
  return result.data;
}

/* Small checks, for routes without a schema library. Each takes the raw value and the field's name. */

/** Text, trimmed: `min` and `max` in characters; "" is missing unless `optional`. */
export function text(
  value: unknown,
  name: string,
  opts: { min?: number; max?: number; optional?: boolean } = {},
): string {
  const s = typeof value === "string" ? value.trim() : value == null ? "" : null;
  if (s === null) throw badRequest(`${name}: must be text.`);
  if (!s) {
    if (opts.optional) return "";
    throw badRequest(`${name}: is required.`);
  }
  if (opts.min !== undefined && s.length < opts.min) throw badRequest(`${name}: at least ${opts.min} characters.`);
  if (opts.max !== undefined && s.length > opts.max) throw badRequest(`${name}: at most ${opts.max} characters.`);
  return s;
}

/** A whole number (a number, or digits in a string), within `min` and `max`. */
export function integer(value: unknown, name: string, opts: { min?: number; max?: number } = {}): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (!Number.isSafeInteger(n)) throw badRequest(`${name}: must be a whole number.`);
  if (opts.min !== undefined && n < opts.min) throw badRequest(`${name}: must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw badRequest(`${name}: must be at most ${opts.max}.`);
  return n;
}

/** One of the allowed values. */
export function oneOf<const T extends string>(value: unknown, name: string, allowed: readonly T[]): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw badRequest(`${name}: must be one of ${allowed.join(", ")}.`);
}

/** A boolean, from JSON or a form ("true", "1", "on", "yes"; "false", "0", "off", "no", ""). */
export function boolean(value: unknown, name: string): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(v)) return true;
    if (["false", "0", "off", "no", ""].includes(v)) return false;
  }
  throw badRequest(`${name}: must be true or false.`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** An email address, trimmed and lower-cased. */
export function email(value: unknown, name = "email"): string {
  const s = text(value, name, { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(s)) throw badRequest(`${name}: is not a valid email address.`);
  return s;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A UUID (route params such as `[id]`). */
export function uuid(value: unknown, name = "id"): string {
  if (typeof value === "string" && UUID_RE.test(value)) return value.toLowerCase();
  throw badRequest(`${name}: is not a valid id.`);
}
