import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import type { StaffRole } from "@/components/admin/nav";
import { getCurrentUser, STAFF } from "@/server/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin · DE LUX" },
  robots: { index: false, follow: false },
};

// Always rendered on request: admin data must be live and the session checked every time.
export const dynamic = "force-dynamic";

/** Only ADMIN and EDITOR users get in; every /api/admin route enforces the same roles independently. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account?next=/admin");

  if (!STAFF.includes(user.role)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-4 text-center">
        <p className="eyebrow text-burgundy">Admin</p>
        <h1 className="display mt-4 text-[40px]">No access</h1>
        <p className="mt-4 max-w-sm text-[14px] text-subtle">
          You&rsquo;re signed in as {user.email}, which is a customer account. Ask an administrator for team access.
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Back to the store
        </Link>
      </div>
    );
  }

  const staff = { name: user.name, email: user.email, role: user.role as StaffRole };
  return (
    <div className="flex min-h-svh bg-paper">
      <AdminSidebar role={staff.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={staff} />
        <main id="main" className="flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
