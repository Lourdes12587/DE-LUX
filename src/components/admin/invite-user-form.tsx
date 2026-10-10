"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";
import { inviteSchema, type InviteInput } from "@/lib/schemas/user";
import { cn } from "@/lib/utils";
import { Panel } from "./ui";

const ROLES = [
  { value: "editor", label: "Editor", note: "Products & content" },
  { value: "admin", label: "Admin", note: "Full access, including payments and users" },
] as const;

export function InviteUserForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", role: "editor" } });
  const role = watch("role");

  const onSubmit = async (values: InviteInput) => {
    setFormError(null);
    try {
      await api("/api/admin/users", { method: "POST", body: values });
      toast("Team member added", { description: values.email });
      // The users page is dynamic, so navigating there loads fresh data (no refresh: it would race the push).
      router.push("/admin/users");
    } catch (err) {
      setFormError(applyServerErrors(err, setError, "Could not add this team member. Please try again."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      <div>
        <Link href="/admin/users" className="nav-label inline-flex items-center gap-2 text-subtle hover:text-ink">
          <ArrowLeft className="size-3.5" /> Users
        </Link>
        <h1 className="display mt-4 text-[40px] sm:text-[48px]">Invite a team member</h1>
        <p className="mt-3 max-w-xl text-[13px] text-subtle">
          The account is created as <strong className="text-ink">Invited</strong>. The invitation email will be sent once login and
          transactional email are set up.
        </p>
      </div>

      {formError && (
        <p role="alert" className="max-w-2xl border border-critical/30 bg-critical/[0.05] px-4 py-3 text-[13px] text-critical">
          {formError}
        </p>
      )}

      <Panel title="Member details" className="max-w-2xl">
        <div className="space-y-7">
          <div>
            <label htmlFor="inv-name" className="eyebrow text-subtle">
              Full name
            </label>
            <input
              id="inv-name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "inv-name-error" : undefined}
              className={cn("field", errors.name && "border-destructive")}
              {...register("name")}
            />
            {errors.name && (
              <p id="inv-name-error" className="mt-1.5 text-[12px] text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="inv-email" className="eyebrow text-subtle">
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "inv-email-error" : undefined}
              className={cn("field", errors.email && "border-destructive")}
              {...register("email")}
            />
            {errors.email && (
              <p id="inv-email-error" className="mt-1.5 text-[12px] text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="eyebrow mb-3 text-subtle">Role</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={cn("flex cursor-pointer items-start gap-3 border p-4 transition-colors", role === r.value ? "border-ink" : "border-stone hover:border-subtle")}
                >
                  <input type="radio" value={r.value} className="mt-1 accent-[#111]" {...register("role")} />
                  <span>
                    <span className="block text-[13px] font-semibold">{r.label}</span>
                    <span className="block text-[11px] text-subtle">{r.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>

      <div className="flex max-w-2xl flex-wrap justify-end gap-3">
        <Link href="/admin/users" className="btn btn-outline h-10 px-5">
          Cancel
        </Link>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary h-10 px-6">
          {isSubmitting ? "Adding…" : "Add team member"}
        </button>
      </div>
    </form>
  );
}
