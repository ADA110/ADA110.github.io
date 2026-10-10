// Line icons for the project cards (24×24, stroked). Shared by the panel (SVG) and the monitor (canvas Path2D).
export const ICONS = {
  cube: [
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "M3.3 7 12 12l8.7-5",
    "M12 22V12",
  ],
  bot: [
    "M12 8V4H8",
    "M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z",
    "M2 14h2",
    "M20 14h2",
    "M15 13v2",
    "M9 13v2",
  ],
  house: [
    "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
    "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  ],
  cap: [
    "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
    "M22 10v6",
    "M6 12.5V16a6 3 0 0 0 12 0v-3.5",
  ],
} as const;

export type IconName = keyof typeof ICONS;

/** Stroke an icon onto a canvas at (x, y), `size` pixels square. */
export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of ICONS[name]) ctx.stroke(new Path2D(d));
  ctx.restore();
}
