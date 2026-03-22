// ── Audio player card drawn onto a canvas element wrapped in FabricImage ──

export interface AudioPlayerDrawOpts {
  trackName: string;
  isPlaying: boolean;
  progress: number; // 0–1
}

export const PLAYER_W = 300;
export const PLAYER_H = 72;

// Manual rounded-rect to avoid relying on ctx.roundRect (Safari < 15.4)
function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPlayIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.65, cy);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawPauseIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const bw = s * 0.28;
  const gap = s * 0.22;
  ctx.fillRect(cx - gap * 0.5 - bw, cy - s * 0.5, bw, s);
  ctx.fillRect(cx + gap * 0.5,       cy - s * 0.5, bw, s);
}

function drawRewindIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Vertical bar
  ctx.fillRect(cx - s * 0.6, cy - s * 0.5, s * 0.22, s);
  // Left-pointing triangle
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.4, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.3, cy);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

export function drawAudioPlayer(
  canvas: HTMLCanvasElement,
  opts: AudioPlayerDrawOpts,
): void {
  const { trackName, isPlaying, progress } = opts;
  const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
  const W = PLAYER_W;
  const H = PLAYER_H;

  // Scale up the backing bitmap for the device pixel ratio on first draw.
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#111111";
  rr(ctx, 0, 0, W, H, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  rr(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.stroke();

  const BTN_Y = Math.round((H - 10) / 2); // vertically centred in the space above the progress bar

  // ── Rewind button (left) ─────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  drawRewindIcon(ctx, 28, BTN_Y, 11);

  // ── Play / pause button (right) ──────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  if (isPlaying) {
    drawPauseIcon(ctx, W - 28, BTN_Y, 11);
  } else {
    drawPlayIcon(ctx, W - 28, BTN_Y, 11);
  }

  // ── Track name ────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const TEXT_X = 54;
  const TEXT_W = W - TEXT_X - 50;
  ctx.fillText(truncate(ctx, trackName, TEXT_W), TEXT_X, BTN_Y);

  // ── Progress bar ─────────────────────────────────────────────────────────
  const BAR_X = 14;
  const BAR_Y = H - 13;
  const BAR_W = W - 28;
  const BAR_H = 3;

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  rr(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, 2);
  ctx.fill();

  if (progress > 0) {
    ctx.fillStyle = "#3b82f6";
    rr(ctx, BAR_X, BAR_Y, BAR_W * Math.min(1, progress), BAR_H, 2);
    ctx.fill();
  }
}
