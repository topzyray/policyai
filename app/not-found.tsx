import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-xs font-medium tracking-[0.16em] text-teal uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">That page is not in the library.</h1>
      <Link href="/" className="mt-6 inline-flex h-10 w-fit items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground">
        Back to PolicyAI
      </Link>
    </main>
  );
}
