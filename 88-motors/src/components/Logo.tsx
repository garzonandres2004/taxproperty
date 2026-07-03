import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-black italic text-white">
        88
      </span>
      <span className="text-xl font-black uppercase tracking-tight">
        Motors
      </span>
    </Link>
  );
}
