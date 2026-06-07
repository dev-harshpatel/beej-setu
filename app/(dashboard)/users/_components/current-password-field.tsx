"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

interface CurrentPasswordFieldProps {
  userId: string;
}

export function CurrentPasswordField({ userId }: CurrentPasswordFieldProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [visible, setVisible]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleReveal() {
    if (password !== null) {
      setVisible((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/users/${userId}/password`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Could not load current password");
        return;
      }
      setPassword(json.data.password);
      setVisible(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Field>
      <FieldLabel>Current Password</FieldLabel>
      <div className="relative">
        <Input
          readOnly
          type={visible ? "text" : "password"}
          value={password ?? ""}
          placeholder="Click eye icon to reveal"
          className="pr-10 bg-muted/50 cursor-default select-all"
        />
        <button
          type="button"
          onClick={handleReveal}
          disabled={loading}
          title={visible ? "Hide password" : "Reveal current password"}
          className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {loading
            ? <span className="text-xs font-medium">…</span>
            : visible
              ? <EyeOffIcon className="size-4" />
              : <EyeIcon className="size-4" />
          }
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive mt-0.5">{error}</p>
      )}
    </Field>
  );
}
