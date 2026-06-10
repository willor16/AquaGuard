"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { TankChrome } from "@/components/TankChrome";
import type { ReactNode } from "react";

export default function TankLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ tankId: string }>();
  return (
    <AuthGate>
      <Shell>
        <TankChrome tankId={params.tankId}>{children}</TankChrome>
      </Shell>
    </AuthGate>
  );
}
