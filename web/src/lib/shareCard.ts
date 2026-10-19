/**
 * Draws the shareable Aura Card as a PNG. Rendered on-device from the card's own fields:
 * no photo of the user is ever part of it (hard rule 1), and the person chooses what shows.
 */

export type ShareFormat = 'story' | 'square';

export const FORMATS: Record<ShareFormat, { label: string; w: number; h: number }> = {
  story: { label: 'Story 9:16', w: 1080, h: 1920 },
  square: { label: 'Post 1:1', w: 1080, h: 1080 },
};

export interface ShareContent {
  season: string;
  palette: string[];
  blurb: string;
  /** e.g. "Oval face · Cool undertone"; null when the person hides it. */
  details: string | null;
  /** First name only, or null. */
  name: string | null;
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function renderShareCard(content: ShareContent, format: ShareFormat): Promise<Blob> {
  const { w, h } = FORMATS[format];
  const story = format === 'story';
  await Promise.all([
    document.fonts.load('600 96px "Fredoka Variable"'),
    document.fonts.load('400 40px "Nunito Variable"'),
    document.fonts.load('700 40px "Nunito Variable"'),
    document.fonts.load('400 60px "Caveat Variable"'),
  ]).catch(() => undefined);
  const mira = await loadImage('/mira/love.png');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your device couldn’t draw the card.');

  // Background: cream page, opal card.
  ctx.fillStyle = token('cream');
  ctx.fillRect(0, 0, w, h);
  const pad = 72;
  const cardTop = story ? 260 : pad;
  const cardH = story ? 1240 : h - pad * 2;
  const grad = ctx.createLinearGradient(pad, cardTop, w - pad, cardTop + cardH);
  grad.addColorStop(0, token('opal-pink'));
  grad.addColorStop(0.5, token('opal-lilac'));
  grad.addColorStop(1, token('opal-blue'));
  roundRect(ctx, pad, cardTop, w - pad * 2, cardH, 56);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = token('gold');
  ctx.stroke();

  const left = pad + 72;
  const inner = w - left * 2;
  let y = cardTop + 120;

  ctx.fillStyle = token('gold-deep');
  ctx.font = '700 34px "Nunito Variable", sans-serif';
  ctx.fillText(content.name ? `${content.name.toUpperCase()}’S AURA CARD` : 'MY AURA CARD', left, y);

  y += story ? 150 : 120;
  ctx.fillStyle = token('cocoa');
  ctx.font = `600 ${story ? 120 : 104}px "Fredoka Variable", sans-serif`;
  for (const line of wrap(ctx, content.season, inner)) {
    ctx.fillText(line, left, y);
    y += story ? 130 : 110;
  }

  if (content.details) {
    y -= story ? 50 : 40;
    ctx.fillStyle = token('cocoa-soft');
    ctx.font = '400 40px "Nunito Variable", sans-serif';
    ctx.fillText(content.details, left, y);
    y += 40;
  }

  // Palette dots.
  y += story ? 70 : 40;
  const dot = story ? 104 : 88;
  const gap = Math.min(28, (inner - dot * content.palette.length) / Math.max(1, content.palette.length - 1));
  content.palette.forEach((hex, i) => {
    const cx = left + dot / 2 + i * (dot + gap);
    ctx.beginPath();
    ctx.arc(cx, y + dot / 2, dot / 2, 0, Math.PI * 2);
    ctx.fillStyle = hex; // card data, not a design token
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = token('paper');
    ctx.stroke();
  });
  y += dot + (story ? 100 : 70);

  ctx.fillStyle = token('cocoa-soft');
  ctx.font = `400 ${story ? 44 : 38}px "Nunito Variable", sans-serif`;
  const blurbLines = wrap(ctx, content.blurb, inner).slice(0, story ? 4 : 3);
  for (const line of blurbLines) {
    ctx.fillText(line, left, y);
    y += story ? 62 : 52;
  }

  if (mira) {
    const size = story ? 300 : 210;
    ctx.drawImage(mira, w - pad - size - 24, cardTop + cardH - size - 24, size, size);
  }

  // Footer.
  ctx.fillStyle = token('cocoa');
  if (story) {
    ctx.textAlign = 'center';
    ctx.font = '600 72px "Fredoka Variable", sans-serif';
    ctx.fillText('AURA', w / 2, 170);
    ctx.font = '400 64px "Caveat Variable", cursive';
    ctx.fillText('what suits me, found with Mira', w / 2, cardTop + cardH + 160);
  } else {
    ctx.font = '600 44px "Fredoka Variable", sans-serif';
    ctx.fillText('AURA', left, h - pad - 64);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your device couldn’t draw the card.'))), 'image/png'));
}
