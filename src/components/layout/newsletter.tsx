"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";
import { newsletterSchema, type NewsletterInput } from "@/lib/schemas/user";

export function Newsletter() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "" } });

  const onSubmit = async (values: NewsletterInput) => {
    try {
      await api("/api/newsletter", { method: "POST", body: values });
      setDone(true);
    } catch (err) {
      const message = applyServerErrors(err, setError, "Something went wrong. Please try again.");
      setError("email", { type: "server", message: message === "Please review the highlighted fields." ? "Enter a valid email address." : message });
    }
  };

  const error = errors.email?.message;

  return (
    <section aria-labelledby="newsletter-title" className="bg-paper">
      <div className="container-edit grid gap-10 py-20 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow text-burgundy">The Letter</p>
          <h2 id="newsletter-title" className="display mt-5 text-[40px] sm:text-[56px]">
            Join the world of <em className="text-burgundy">De Lux</em>
          </h2>
        </div>
        <div className="flex flex-col justify-end lg:col-span-5 lg:col-start-8">
          <p className="max-w-md text-[15px] text-subtle">
            Sign up for new collections, exclusive access and private events.
          </p>
          {done ? (
            <p role="status" className="mt-8 font-display text-2xl italic">
              Thank you — welcome to the world of De Lux.
            </p>
          ) : (
            <form className="mt-8 flex items-end gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? "newsletter-error" : undefined}
                className="field flex-1"
                {...register("email")}
              />
              <button type="submit" disabled={isSubmitting} className="link-underline mb-3 disabled:opacity-40">
                {isSubmitting ? "Joining…" : "Join"}
              </button>
            </form>
          )}
          {error && !done && (
            <p id="newsletter-error" role="alert" className="mt-2 text-[12px] text-destructive">
              {error}
            </p>
          )}
          <p className="mt-4 text-[11px] text-subtle">
            By subscribing you agree to our Privacy Policy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
