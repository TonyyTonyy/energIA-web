"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Zap } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/lib/constants";
import { DataModeToggle } from "./data-mode-toggle";

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="EnergIA"
              className="h-16 group-data-[collapsible=icon]:justify-center"
            >
              <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                <Zap
                  role="img"
                  aria-label="EnergIA"
                  className="text-primary hidden group-data-[collapsible=icon]:block"
                />
                <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <Image
                    src="/EnergIA.png"
                    alt="EnergIA"
                    width={120}
                    height={32}
                    className="h-8 w-30 object-cover brightness-[0.35] dark:brightness-100"
                  />
                  <span className="text-gray-300 truncate text-[13px] font-[500]">
                    - desperdício | + eficiência
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DataModeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
