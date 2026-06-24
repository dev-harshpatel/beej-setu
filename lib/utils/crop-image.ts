import type { Area } from "react-easy-crop";

/**
 * Draws the selected crop area of an image onto a canvas and returns it
 * as a PNG blob, resized to outputWidth × outputHeight.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropAreaPixels: Area,
  outputWidth = 512,
  outputHeight = 512
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to crop image"));
    }, "image/png");
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image")));
    image.src = src;
  });
}
