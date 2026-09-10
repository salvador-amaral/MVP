"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LayoutList,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Defined inside the client module so component icons are never serialized
// across the Server → Client boundary.
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/requests", label: "Pedidos", icon: Send },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/templates", label: "Modelos", icon: LayoutList },
  { href: "/settings", label: "Definições", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
