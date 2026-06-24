"use client";

import { useState } from "react";
import { MessageCircleIcon } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppSharePanel } from "@/app/(dashboard)/orders/_components/whatsapp-share-panel";
import type { VariantProps } from "class-variance-authority";

interface ShareWhatsAppButtonProps {
  message: string;
  label?: string;
  dialogTitle?: string;
  panelTitle?: string;
  panelSubtitle?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  /** Render as an icon-only button (used in compact table rows) */
  iconOnly?: boolean;
}

export function ShareWhatsAppButton({
  message,
  label = "Share on WhatsApp",
  dialogTitle = "Share on WhatsApp",
  panelTitle,
  panelSubtitle,
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: ShareWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={label}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MessageCircleIcon className="size-3.5" />
        </button>
      ) : (
        <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
          <MessageCircleIcon className="size-3.5" />
          <span>{label}</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg flex flex-col overflow-hidden gap-0 p-6 pt-8">
          <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
          <WhatsAppSharePanel
            message={message}
            title={panelTitle}
            subtitle={panelSubtitle}
            doneLabel="Close"
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
