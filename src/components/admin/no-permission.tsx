import Link from "next/link";

/** Shown to editors on admin-only pages (payments, users). The matching APIs return 403 as well. */
export function NoPermission() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="display text-[36px]">Administrators only</h1>
      <p className="mt-3 max-w-sm text-[13px] text-subtle">Your editor account can manage products. Ask an administrator for access to this section.</p>
      <Link href="/admin/products" className="btn btn-primary mt-8 h-10 px-5">
        Go to products
      </Link>
    </div>
  );
}
