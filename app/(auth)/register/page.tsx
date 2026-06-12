import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Register your company",
};

export default function RegisterPage() {
  return (
    <div className="grid h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-2 overflow-y-auto p-4 md:p-6">
        <div className="flex shrink-0 justify-center gap-2 md:justify-start">
          <a href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Leaf className="size-4" />
            </div>
            Beej Setu
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-[#E9F5DB]">
        <div className="flex flex-col items-center gap-4 text-center px-12">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
            <Leaf className="size-7 text-[#2A5010]" />
          </div>
          <h2 className="text-3xl font-bold text-[#2A5010]">Beej Setu</h2>
          <p className="text-[#3a6b1e] text-base leading-relaxed max-w-xs">
            Onboard your company and manage seed orders with ease.
          </p>
        </div>
      </div>
    </div>
  );
}
