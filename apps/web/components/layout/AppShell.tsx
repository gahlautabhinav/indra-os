"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SigilBar } from "@/components/layout/SigilBar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandEther } from "@/components/command/CommandEther";

// Routes reachable without a session token.
const PUBLIC_ROUTES = new Set(["/login"]);

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("indra_token"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  // `null` = not yet checked (avoid flashing protected content during SSR/first paint).
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = hasToken();
    setAuthed(ok);
    if (!ok && !isPublic) {
      router.replace("/login");
    }
  }, [pathname, isPublic, router]);

  // Public pages (login) render bare — no sidebar / topbar.
  if (isPublic) {
    return <>{children}</>;
  }

  // Until the token check resolves, or while redirecting an unauthenticated
  // user, render a neutral canvas instead of the protected UI.
  if (authed !== true) {
    return <div className="h-screen w-screen bg-canvas" />;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <SigilBar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto bg-canvas">{children}</main>
        </div>
      </div>
      <CommandEther />
    </>
  );
}
