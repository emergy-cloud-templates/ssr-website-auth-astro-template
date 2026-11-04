// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Lego ui-primitives (2.0.0): portal-safe ids for the field primitives.
import { useId, useRef } from "preact/hooks";

let seq = 0;

/**
 * An id unique on the page, also inside a portal. Preact's `useId` restarts its sequence inside `createPortal`
 * (the `Modal` renders through one), so two fields there could share an id and a label would point at the wrong
 * field (/common/knowledge/gotchas/preact-useid-modal-portal.md). A per-instance counter suffix keeps them
 * apart. Ids are not stable between the server render and hydration; nothing here relies on that, and an
 * explicit `id` prop still wins at every call site.
 */
export function useFieldId(): string {
  const base = useId();
  const ref = useRef("");
  if (!ref.current) ref.current = `${base}-${++seq}`;
  return ref.current;
}
