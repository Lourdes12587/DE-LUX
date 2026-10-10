import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-edit flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-[120px] leading-none text-burgundy italic sm:text-[200px]">404</p>
      <h1 className="display mt-4 text-[36px]">This page has left the runway</h1>
      <p className="mt-4 text-[14px] text-subtle">The piece you&rsquo;re looking for may have sold out or moved.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link href="/" className="btn btn-primary">Back to home</Link>
        <Link href="/shop" className="btn btn-outline">Shop all</Link>
      </div>
    </div>
  );
}
