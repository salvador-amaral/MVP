import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-6 flex items-center gap-2 font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-base text-primary-foreground">
          ✦
        </span>
        <span className="text-lg">PrepApp</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
