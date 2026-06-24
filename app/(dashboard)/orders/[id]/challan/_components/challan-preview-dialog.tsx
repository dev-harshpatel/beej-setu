"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { challanService } from "@/services/challan.service";

interface ChallanPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  challanNumber: string;
  onContinue?: () => void;
}

export function ChallanPreviewDialog({
  open,
  onOpenChange,
  orderId,
  challanNumber,
  onContinue,
}: ChallanPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: blob, isLoading: loading, error } = useQuery({
    queryKey: ["challan-pdf", orderId],
    queryFn: () => challanService.getChallanPdfBlob(orderId),
    enabled: open,
    staleTime: 0,
  });

  const pdfUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${challanNumber}.pdf`;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Delivery Challan — {challanNumber}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden h-[70vh]">
          {loading && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Generating challan…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-sm text-destructive px-6 text-center">
              {(error as Error).message ?? "Failed to generate challan PDF."}
            </div>
          )}
          {!loading && !error && pdfUrl && (
            <iframe ref={iframeRef} src={pdfUrl} className="w-full h-full" title="Delivery Challan" />
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pdfUrl}>
              <DownloadIcon className="size-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!pdfUrl}>
              <PrinterIcon className="size-4" />
              Print
            </Button>
          </div>
          {onContinue && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onContinue();
              }}
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
