// Probe a fixed California tile containing cities, terrain, and the coastline.
// Some providers return a PNG error placard with HTTP 200; decoding alone is
// insufficient. This sample must contain substantial colored map detail.
export function hasMapDetail(pixels: ArrayLike<number>): boolean {
  let colored = 0;
  const count = Math.floor(pixels.length / 4);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 18) colored += 1;
  }
  return count > 0 && colored / count > 0.12;
}

export function probeMapTile(url: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(false); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "strict-origin-when-cross-origin";
    let settled = false;
    const finish = (healthy: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      resolve(healthy);
    };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(false), 8_000);
    signal.addEventListener("abort", abort, { once: true });
    image.onerror = () => finish(false);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { finish(false); return; }
        context.drawImage(image, 0, 0, 256, 256);
        finish(hasMapDetail(context.getImageData(0, 0, 256, 256).data));
      } catch { finish(false); }
    };
    image.src = url;
  });
}
