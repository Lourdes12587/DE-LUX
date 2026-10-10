import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiRequestError } from "@/lib/api";

/**
 * Copies zod field errors returned by the API (`details.fieldErrors`, see src/server/http.ts) onto the form.
 * Returns a message for the form-level alert (or null when every error landed on a field).
 */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fallback: string) {
  if (!(err instanceof ApiRequestError)) return fallback;
  const fieldErrors = (err.details as { fieldErrors?: Record<string, string[] | undefined> } | undefined)?.fieldErrors;
  if (!fieldErrors) return err.message;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) setError(field as Path<T>, { type: "server", message: messages[0] });
  }
  return "Please review the highlighted fields.";
}
