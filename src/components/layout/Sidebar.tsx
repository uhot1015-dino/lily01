"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  ShoppingBag,
  CreditCard,
  Package,
  BarChart2,
  Settings,
  LogOut,
  Flower,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/accounting", label: "收支記帳", icon: BookOpen },
  { href: "/orders", label: "訂單管理", icon: ShoppingBag },
  { href: "/advances", label: "代墊 & 核銷", icon: CreditCard },
  { href: "/shipping", label: "出貨單", icon: Package },
  { href: "/reports", label: "報表", icon: BarChart2, adminOnly: true },
  { href: "/settings", label: "設定", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-neutral-100">
        <Flower className="h-6 w-6 text-rose-500" />
        <span className="font-bold text-lg tracking-tight">GOODLILY</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-rose-50 text-rose-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-100 px-3 py-4">
        <div className="px-3 py-2 text-xs text-neutral-500 mb-1">
          {session?.user?.name}
          <span className="ml-1 text-neutral-400">
            ({isAdmin ? "管理員" : "員工"})
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>
    </aside>
  );
}
