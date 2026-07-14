import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-muted-foreground">
        The page you requested does not exist in the agentOrc documentation.
      </p>
      <Link
        href="/docs"
        className="mt-6 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Back to docs
      </Link>
    </div>
  );
}
