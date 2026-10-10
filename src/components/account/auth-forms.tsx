"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiRequestError } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/schemas/auth";
import { useSession, type SessionUser } from "@/store/session";
import { cn } from "@/lib/utils";

function AuthField({
  id,
  label,
  error,
  registration,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: FieldError; registration: UseFormRegisterReturn; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-subtle">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("field", error && "border-destructive")}
        {...props}
        {...registration}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-destructive">
          {error.message}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] text-subtle">{hint}</p>
      )}
    </div>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[13px] text-destructive">
      {message}
    </p>
  );
}

function useAfterAuth(next: string) {
  const router = useRouter();
  const setUser = useSession((s) => s.setUser);
  return (user: SessionUser) => {
    setUser(user);
    toast(`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`);
    router.replace(next);
    router.refresh();
  };
}

function LoginForm({ next }: { next: string }) {
  const done = useAfterAuth(next);
  const [alert, setAlert] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: LoginInput) => {
    setAlert(null);
    try {
      const { user } = await api<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: values });
      done(user);
    } catch (e) {
      setAlert(applyServerErrors(e, setError, "We couldn't sign you in. Please try again."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-7">
      <AuthField id="login-email" label="Email" type="email" autoComplete="email" error={errors.email} registration={register("email")} />
      <AuthField id="login-password" label="Password" type="password" autoComplete="current-password" error={errors.password} registration={register("password")} />
      <div className="flex justify-end">
        <Link href="/contact" className="text-[12px] text-subtle underline underline-offset-4 hover:text-ink">
          Forgot your password?
        </Link>
      </div>
      <FormAlert message={alert} />
      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function RegisterForm({ next }: { next: string }) {
  const done = useAfterAuth(next);
  const [alert, setAlert] = useState<string | null>(null);
  const [needsProof, setNeedsProof] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", marketingOptIn: false, orderNumber: "" },
  });

  const onSubmit = async (values: RegisterInput) => {
    setAlert(null);
    try {
      const { user } = await api<{ user: SessionUser }>("/api/auth/register", { method: "POST", body: values });
      done(user);
    } catch (e) {
      // The email already has orders from before accounts existed: ask for one order number as proof of ownership.
      if (e instanceof ApiRequestError && (e.details as { code?: string } | undefined)?.code === "order_proof_required") {
        setNeedsProof(true);
        setAlert(e.message);
        return;
      }
      setAlert(applyServerErrors(e, setError, "We couldn't create your account. Please try again."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-7">
      <div className="grid grid-cols-2 gap-6">
        <AuthField id="reg-first" label="First name" autoComplete="given-name" error={errors.firstName} registration={register("firstName")} />
        <AuthField id="reg-last" label="Last name" autoComplete="family-name" error={errors.lastName} registration={register("lastName")} />
      </div>
      <AuthField id="reg-email" label="Email" type="email" autoComplete="email" error={errors.email} registration={register("email")} />
      <AuthField
        id="reg-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with letters and a number"
        error={errors.password}
        registration={register("password")}
      />
      {needsProof && (
        <AuthField
          id="reg-order"
          label="Order number"
          placeholder="PH-2026-00125"
          hint="Found on your order confirmation and in your payment receipt"
          error={errors.orderNumber}
          registration={register("orderNumber")}
        />
      )}
      <label className="flex items-start gap-3 text-[12px] text-subtle">
        <input type="checkbox" className="mt-0.5 accent-[#111]" {...register("marketingOptIn")} />
        Sign me up for new collections, exclusive access and private events.
      </label>
      <FormAlert message={alert} />
      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function AuthForms({ next, intro }: { next: string; intro?: string }) {
  return (
    <div className="w-full max-w-md">
      <h1 className="display text-[48px]">My Account</h1>
      {intro && <p className="mt-4 text-[14px] text-subtle">{intro}</p>}
      <Tabs defaultValue="login" className="mt-10">
        <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-stone bg-transparent p-0">
          {[
            ["login", "Sign in"],
            ["register", "Create account"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="nav-label -mb-px flex-none rounded-none border-0 border-b border-transparent bg-transparent px-0 pb-3 text-subtle shadow-none data-[state=active]:border-ink data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="login">
          <LoginForm next={next} />
        </TabsContent>
        <TabsContent value="register">
          <RegisterForm next={next} />
        </TabsContent>
      </Tabs>
      <ul className="mt-12 space-y-2 border-t border-stone pt-8 text-[12px] text-subtle">
        <li>— Track your orders and their delivery</li>
        <li>— Faster checkout with your saved address</li>
        <li>— Already ordered with us? Create an account with the same email to see those orders</li>
      </ul>
    </div>
  );
}
