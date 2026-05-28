"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Resolver } from "react-hook-form";
import { createDealerSchema, updateDealerSchema, type CreateDealerFormValues, type UpdateDealerFormValues } from "@/lib/validators/dealers.validators";
import { DEALER_STATUSES, DEALER_STATUS_LABELS } from "@/constants/dealer-status.constants";
import type { DealerStatusValue } from "@/constants/dealer-status.constants";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";
import type { ProfileRow } from "@/types/database.types";

interface DealerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealer?: DealerWithStaffRow | null;
  staffList: ProfileRow[];
  onSuccess: () => void;
}

export function DealerFormDialog({ open, onOpenChange, dealer, staffList, onSuccess }: DealerFormDialogProps) {
  const isEdit = !!dealer;
  const [saveError, setSaveError] = useState<string | null>(null);

  const schema = isEdit ? updateDealerSchema : createDealerSchema;
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateDealerFormValues & UpdateDealerFormValues>({
    resolver: zodResolver(schema) as Resolver<CreateDealerFormValues & UpdateDealerFormValues>,
    defaultValues: {
      name: "", contact: "", staffId: null,
      defaultTransport: "", territory: "",
      status: DEALER_STATUSES.ACTIVE,
    },
  });

  useEffect(() => {
    if (open) {
      setSaveError(null);
      reset({
        name:             dealer?.name ?? "",
        contact:          dealer?.contact ?? "",
        staffId:          dealer?.staff_id ?? null,
        defaultTransport: dealer?.default_transport ?? "",
        territory:        dealer?.territory ?? "",
        status:           (dealer?.status as DealerStatusValue | undefined) ?? DEALER_STATUSES.ACTIVE,
      });
    }
  }, [open, dealer, reset]);

  async function onSubmit(values: CreateDealerFormValues & UpdateDealerFormValues) {
    setSaveError(null);
    try {
      const url    = isEdit ? `/api/dealers/${dealer!.id}` : "/api/dealers";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(json.message ?? "Failed to save. Please try again.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setSaveError("Something went wrong. Please try again.");
    }
  }

  const staffId     = watch("staffId");
  const statusValue = watch("status") as DealerStatusValue | undefined;

  function handleStaffChange(v: string | null) {
    const id = !v || v === "none" ? null : v;
    setValue("staffId", id);
    if (id) {
      const staff = staffList.find((s) => s.id === id);
      if (staff?.territory) setValue("territory", staff.territory);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Dealer" : "Add Dealer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-1">

          {/* Name + Contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Dealer Name *</Label>
              <Input id="name" {...register("name")} placeholder="Patel Beej Bhandar" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact">Contact *</Label>
              <Input id="contact" {...register("contact")} placeholder="9824011234" />
              {errors.contact && <p className="text-xs text-destructive">{errors.contact.message}</p>}
            </div>
          </div>

          {/* Assigned Staff + Territory (territory auto-fills from staff) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Assigned Staff</Label>
              <Select value={staffId ?? "none"} onValueChange={handleStaffChange}>
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left text-sm truncate">
                    {staffId && staffId !== "none"
                      ? (staffList.find((s) => s.id === staffId)?.name ?? dealer?.staff?.name ?? staffId)
                      : <span className="text-muted-foreground">Unassigned</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.territory ? ` — ${s.territory}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="territory">Territory</Label>
              <Input id="territory" {...register("territory")} placeholder="Saurashtra" />
            </div>
          </div>

          {/* Default Transport */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultTransport">Default Transport</Label>
            <Input id="defaultTransport" {...register("defaultTransport")} placeholder="VRL Logistics" />
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={statusValue ?? DEALER_STATUSES.ACTIVE}
                onValueChange={(v) => setValue("status", v as DealerStatusValue)}
              >
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left text-sm truncate">
                    {statusValue ? (DEALER_STATUS_LABELS[statusValue] ?? statusValue) : "Select status"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DEALER_STATUSES).map((s) => (
                    <SelectItem key={s} value={s}>{DEALER_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save Changes" : "Add Dealer")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
