"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createDealerSchema, type CreateDealerFormValues } from "@/lib/validators/dealers.validators";
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateDealerFormValues>({
    resolver: zodResolver(createDealerSchema),
    defaultValues: { name: "", contact: "", staffId: null, defaultTransport: "", defaultDeliveryInstruction: "", territory: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: dealer?.name ?? "",
        contact: dealer?.contact ?? "",
        staffId: dealer?.staff_id ?? null,
        defaultTransport: dealer?.default_transport ?? "",
        defaultDeliveryInstruction: dealer?.default_delivery_instruction ?? "",
        territory: dealer?.territory ?? "",
        notes: dealer?.notes ?? "",
      });
    }
  }, [open, dealer, reset]);

  async function onSubmit(values: CreateDealerFormValues) {
    const url = isEdit ? `/api/dealers/${dealer!.id}` : "/api/dealers";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      onOpenChange(false);
      onSuccess();
    }
  }

  const staffId = watch("staffId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Dealer" : "Add Dealer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-1">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Assigned Staff</Label>
              <Select value={staffId ?? "none"} onValueChange={(v) => setValue("staffId", v === "none" ? null : v)}>
                <SelectTrigger className="w-full">
                  <span className="flex-1 text-left text-sm truncate">
                    {staffId && staffId !== "none"
                      ? (staffList.find((s) => s.id === staffId)?.name ?? dealer?.staff?.name ?? staffId)
                      : <span className="text-muted-foreground">Unassigned</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="territory">Territory</Label>
              <Input id="territory" {...register("territory")} placeholder="Saurashtra" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultTransport">Default Transport</Label>
            <Input id="defaultTransport" {...register("defaultTransport")} placeholder="VRL Logistics" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultDeliveryInstruction">Default Delivery Instruction</Label>
            <textarea
              id="defaultDeliveryInstruction"
              {...register("defaultDeliveryInstruction")}
              placeholder="Deliver before 10am, call before dispatch"
              rows={2}
              className={cn("w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional notes"
              rows={2}
              className={cn("w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50")}
            />
          </div>

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
