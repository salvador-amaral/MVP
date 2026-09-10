import Link from "next/link";
import { NavLinks } from "@/components/app/nav-links";
import { SubmitButton } from "@/components/shared/submit-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/server/actions/auth";
import { LogOut } from "lucide-react";

export function AppShell({
  orgName,
  userName,
  children,
}: {
  orgName: string;
  userName: string;
  children: React.ReactNode;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 font-bold"
              title={orgName}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
                ✦
              </span>
              <span className="hidden truncate sm:inline">{orgName}</span>
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium leading-tight">{userName}</div>
              <div className="text-xs text-muted-foreground leading-tight">
                {orgName}
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials || "?"}
            </div>
            <ThemeToggle />
            <form action={signOutAction}>
              <SubmitButton
                variant="ghost"
                size="icon"
                aria-label="Terminar sessão"
                pendingText=""
                title="Terminar sessão"
              >
                <LogOut className="h-4 w-4" />
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
