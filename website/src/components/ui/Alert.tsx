import type { ComponentChildren } from "preact";

interface AlertProps {
  type: "success" | "error" | "info";
  children: ComponentChildren;
}

const STYLES: Record<AlertProps["type"], string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export function Alert({ type, children }: AlertProps) {
  // Errors interrupt screen readers; confirmations are announced politely.
  return (
    <div role={type === "error" ? "alert" : "status"} class={`rounded-md border p-4 text-sm ${STYLES[type]}`}>
      {children}
    </div>
  );
}
