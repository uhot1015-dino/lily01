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
  MoreHorizontal,
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

// Mobile bottom nav shows these 4 main items always + admin items in "more"
const mobileMainItems = [
  { href: "/accounting", label: "記帳", icon: BookOpen },
  { href: "/orders", label: "訂單", icon: ShoppingBag },
  { href: "/advances", label: "代墊", icon: CreditCard },
  { href: "/shipping", label: "出貨", icon: Package },
];

const mobileAdminItems = [
  { href: "/reports", label: "報表", icon: BarChart2 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-56 flex-col border-r border-neutral-200 bg-white flex-shrink-0">
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 flex">
        {mobileMainItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors gap-1",
                active
                  ? "text-rose-600"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <div className="flex-1 flex flex-col items-center justify-center py-2 gap-1">
            <div className="relative group">
              <button className="flex flex-col items-center gap-1 text-xs font-medium text-neutral-500">
                <MoreHorizontal className="h-5 w-5" />
                更多
              </button>
              <div className="absolute bottom-10 right-0 bg-white border border-neutral-200 rounded-lg shadow-lg hidden group-focus-within:block min-w-[100px]">
                {mobileAdminItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 border-t border-neutral-100"
                >
                  <LogOut className="h-4 w-4" />
                  登出
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
