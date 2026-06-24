"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, MessageCircleIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface WhatsAppSharePanelProps {
  message: string;
  title?: string;
  subtitle?: string;
  doneLabel?: string;
  /** Fill parent height — use when the panel is the sole content of a full-screen modal */
  expand?: boolean;
  onDone: () => void;
}

export function WhatsAppSharePanel({
  message,
  title = "Share on WhatsApp",
  subtitle = "Copy the message or tap Open WhatsApp, then paste it in your group.",
  doneLabel,
  expand = false,
  onDone,
}: WhatsAppSharePanelProps) {
  const [copied, setCopied] = useState(false);

  const resolvedDoneLabel = doneLabel ?? (expand ? "Go to Orders" : "Done");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const el = document.createElement("textarea");
      el.value = message;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenWhatsApp() {
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <div className={expand ? "flex flex-1 flex-col gap-5 p-6 min-h-0" : "flex flex-col gap-5"}>
      {/* Header */}
      <div className={`flex items-center gap-3 ${expand ? "shrink-0" : ""}`}>
        <div className={`flex shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 ${expand ? "size-10" : "size-9"}`}>
          <MessageCircleIcon className={`text-[#25D366] ${expand ? "size-5" : "size-4"}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Message preview */}
      <div className={`rounded-xl border border-border bg-muted/30 overflow-hidden ${expand ? "flex-1 min-h-0 flex flex-col" : ""}`}>
        <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 ${expand ? "shrink-0" : ""}`}>
          <p className="text-xs font-medium text-muted-foreground">Message Preview</p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <><CheckIcon className="size-3.5 text-[#25D366]" /><span className="text-[#25D366]">Copied!</span></>
            ) : (
              <><CopyIcon className="size-3.5" />Copy</>
            )}
          </button>
        </div>
        <pre className={`px-4 py-4 text-xs leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground ${expand ? "flex-1 overflow-y-auto" : "max-h-60 overflow-y-auto"}`}>
          {message}
        </pre>
      </div>

      {/* Actions */}
      <div className={`flex flex-col gap-2.5 ${expand ? "shrink-0" : ""}`}>
        <Button
          className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold"
          onClick={handleOpenWhatsApp}
        >
          <MessageCircleIcon className="size-4" />
          Open WhatsApp
        </Button>
        <Button variant="outline" className="w-full gap-1.5" onClick={onDone}>
          {resolvedDoneLabel}
          {expand && <ArrowRightIcon className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
