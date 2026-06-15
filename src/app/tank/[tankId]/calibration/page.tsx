"use client";

import { useParams } from "next/navigation";
import { CalibrationPanel } from "@/components/CalibrationPanel";

export default function CalibrationPage() {
  const params = useParams<{ tankId: string }>();
  return <CalibrationPanel tankId={params.tankId} />;
}
