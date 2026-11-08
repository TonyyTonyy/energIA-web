import { Suspense, type ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppDataProvider } from "@/components/layout/app-data-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<div className="h-14 border-b" />}>
          <AppHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
    </AppDataProvider>
  );
}
