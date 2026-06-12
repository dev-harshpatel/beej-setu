"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImageBlob } from "@/lib/utils/crop-image";

interface LogoCropperDialogProps {
  /**
   * Object URL of the picked image; null keeps the dialog closed.
   * The CALLER owns the URL lifecycle (create on pick, revoke on close) —
   * managing it in an effect here breaks under StrictMode's double-mount,
   * which revokes the URL while the component is still in use.
   */
  imageSrc: string | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => Promise<void>;
}

export function LogoCropperDialog({ imageSrc, onCancel, onCropped }: LogoCropperDialogProps) {
  return (
    <Dialog open={!!imageSrc} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        {imageSrc && (
          // Keyed by url so crop/zoom state resets per picked file
          <CropperBody
            key={imageSrc}
            imageSrc={imageSrc}
            onCancel={onCancel}
            onCropped={onCropped}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CropperBody({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!cropAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, cropAreaPixels);
      await onCropped(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Crop your logo</DialogTitle>
        <DialogDescription>
          Drag to position and zoom to fit — the logo is saved as a square.
        </DialogDescription>
      </DialogHeader>

      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          aria-label="Zoom"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving || !cropAreaPixels}>
          {saving ? "Saving…" : "Save logo"}
        </Button>
      </DialogFooter>
    </>
  );
}
