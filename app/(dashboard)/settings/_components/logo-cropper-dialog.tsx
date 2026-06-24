"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
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

type CropShape = "rectangle" | "square";

const SHAPES: { id: CropShape; label: string; aspect: number }[] = [
  { id: "rectangle", aspect: 2, label: "Rectangle" },
  { id: "square", aspect: 1, label: "Square" },
];

const OUTPUT: Record<CropShape, { width: number; height: number }> = {
  rectangle: { width: 512, height: 256 },
  square: { width: 512, height: 512 },
};

// The zoom at which the whole image is contained with no overflow —
// react-easy-crop treats zoom=1 as "cover", not "contain".
function calcFitZoom(imageAspect: number, cropAspect: number): number {
  return Math.min(cropAspect, imageAspect) / Math.max(cropAspect, imageAspect);
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
  const [shape, setShape] = useState<CropShape>("rectangle");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  const currentAspect = SHAPES.find((s) => s.id === shape)!.aspect;
  const fitZoom = naturalAspect !== null ? calcFitZoom(naturalAspect, currentAspect) : 1;
  const minZoom = Math.max(fitZoom * 0.6, 0.05);
  const maxZoom = 4;

  // Reset crop/zoom to "fit" for a given aspect — called directly from the
  // shape-toggle click handler and once the image's natural size is known,
  // rather than from an effect, so it doesn't trigger cascading renders.
  function resetToFit(aspect: number, knownNaturalAspect: number) {
    setCrop({ x: 0, y: 0 });
    setZoom(calcFitZoom(knownNaturalAspect, aspect));
    setCropAreaPixels(null);
  }

  function selectShape(nextShape: CropShape) {
    setShape(nextShape);
    if (naturalAspect !== null) {
      const nextAspect = SHAPES.find((s) => s.id === nextShape)!.aspect;
      resetToFit(nextAspect, naturalAspect);
    }
  }

  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    const aspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
    setNaturalAspect(aspect);
    resetToFit(currentAspect, aspect);
  }, [currentAspect]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropAreaPixels(areaPixels);
  }, []);

  function handleFit() {
    if (naturalAspect === null) return;
    resetToFit(currentAspect, naturalAspect);
  }

  async function handleSave() {
    if (!cropAreaPixels) return;
    setSaving(true);
    try {
      const { width, height } = OUTPUT[shape];
      const blob = await getCroppedImageBlob(imageSrc, cropAreaPixels, width, height);
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
          Drag to position and zoom to fit — the logo is saved as a {shape === "square" ? "square" : "rectangle"}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        {SHAPES.map((s) => (
          <Button
            key={s.id}
            type="button"
            variant={shape === s.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => selectShape(s.id)}
            disabled={saving}
          >
            {s.label}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={handleFit} disabled={saving}>
          Fit
        </Button>
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          aspect={currentAspect}
          restrictPosition={false}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onMediaLoaded={onMediaLoaded}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
            [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1.5
            [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border
            [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow"
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
