"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import Link from "next/link";

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl font-bold text-muted-foreground/30">404</span>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page doesn&apos;t exist or hasn&apos;t been built yet.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="size-3.5" />
          Go back
        </Button>
        <Link href={ROUTES.DASHBOARD.ROOT}>
          <Button size="sm" className="w-full sm:w-auto">
            <HomeIcon className="size-3.5" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
