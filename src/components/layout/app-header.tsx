"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/lib/constants";

export function AppHeader() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const isDetail = current ? pathname !== current.href : false;
  const detailId = isDetail ? pathname.split("/").pop() : undefined;

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">EnergIA</span>
        <span className="text-muted-foreground">/</span>
        <span className={detailId ? "text-muted-foreground" : "font-medium"}>
          {current?.title ?? "Início"}
        </span>
        {detailId ? (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{decodeURIComponent(detailId)}</span>
          </>
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
              GM
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">
            Gestão / Manutenção
          </span>
        </div>
      </div>
    </header>
  );
}
