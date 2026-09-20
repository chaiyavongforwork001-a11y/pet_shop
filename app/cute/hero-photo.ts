/* PAWPAL cute — procedural polaroid card for the hero photo moment. No three import. */

const CARD_W = 1080;
const CARD_H = 1350;
const PANEL = { x: 60, y: 60, size: 960, radius: 46 };

type Ctx = CanvasRenderingContext2D;

function roundedPath(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function pawMark(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  color: string,
  tilt: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.26, size * 0.44, size * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes: [number, number, number][] = [
    [-size * 0.44, -size * 0.2, -0.35],
    [-size * 0.16, -size * 0.38, 0],
    [size * 0.16, -size * 0.38, 0],
    [size * 0.44, -size * 0.2, 0.35],
  ];
  for (const [tx, ty, rot] of toes) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, size * 0.16, size * 0.21, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export async function composePolaroid(
  shot: HTMLCanvasElement,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#fffdf9";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  /* lilac gradient panel, with the transparent render on top */
  ctx.save();
  roundedPath(ctx, PANEL.x, PANEL.y, PANEL.size, PANEL.size, PANEL.radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(
    PANEL.x,
    PANEL.y,
    PANEL.x + PANEL.size,
    PANEL.y + PANEL.size,
  );
  gradient.addColorStop(0, "#d6c6f2");
  gradient.addColorStop(1, "#bfa8e6");
  ctx.fillStyle = gradient;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.size, PANEL.size);
  if (shot.width > 0 && shot.height > 0) {
    const scale = Math.min(PANEL.size / shot.width, PANEL.size / shot.height);
    const w = shot.width * scale;
    const h = shot.height * scale;
    ctx.drawImage(
      shot,
      PANEL.x + (PANEL.size - w) / 2,
      PANEL.y + (PANEL.size - h) / 2,
      w,
      h,
    );
  }
  ctx.restore();

  /* five soft paw doodles scattered around the card edges */
  const doodles: [number, number, number, number][] = [
    [34, 1044, 38, -0.32],
    [1046, 372, 34, 0.42],
    [28, 302, 30, 0.18],
    [176, 1288, 32, -0.5],
    [1040, 1046, 36, 0.26],
  ];
  for (const [dx, dy, size, tilt] of doodles)
    pawMark(ctx, dx, dy, size, "#e4d4f2", tilt);

  try {
    await document.fonts.ready;
  } catch {
    /* fonts are optional — fall back to the system stack */
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#30233f";
  ctx.font = "600 54px 'Noto Sans Thai', sans-serif";
  ctx.fillText("เพื่อนซี้ของฉัน ♡", CARD_W / 2, 1130);
  ctx.fillStyle = "#74518d";
  ctx.font = "500 30px Outfit, sans-serif";
  ctx.fillText(
    `PAWPAL · ${new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}`,
    CARD_W / 2,
    1190,
  );

  pawMark(ctx, 992, 1258, 30, "#b998df", 0.2);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
