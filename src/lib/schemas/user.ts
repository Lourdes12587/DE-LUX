import { z } from "zod";

// Shared by admin user forms (react-hook-form) and /api/admin/users.

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address").max(200)),
  role: z.enum(["editor", "admin"]),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const userUpdateSchema = z
  .object({
    role: z.enum(["customer", "editor", "admin"]).optional(),
    status: z.enum(["active", "blocked", "invited"]).optional(),
  })
  .refine((v) => v.role || v.status, "Nothing to update");
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email address").max(200)),
});
export type NewsletterInput = z.infer<typeof newsletterSchema>;

/** Role editor in the admin user panel. */
export const roleFormSchema = z.object({ role: z.enum(["customer", "editor", "admin"]) });
export type RoleFormValues = z.infer<typeof roleFormSchema>;
