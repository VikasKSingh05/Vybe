import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
          <AlertTriangle className="h-6 w-6 text-white/15" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-white/50">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 cursor-pointer"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
