import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

const fontPath = '/tmp/chakra-petch-600.ttf';
const font = opentype.loadSync(fontPath);

const TEXT = 'DUPLIA';
const FONT_SIZE = 72;
const LETTER_SPACING = 13; // px extra between chars
const PAD_X = 40;
const PAD_Y = 28;

// --- measure total text width ---
let totalWidth = 0;
for (let i = 0; i < TEXT.length; i++) {
  const g = font.charToGlyph(TEXT[i]);
  const adv = (g.advanceWidth / font.unitsPerEm) * FONT_SIZE;
  totalWidth += adv;
  if (i < TEXT.length - 1) totalWidth += LETTER_SPACING;
}

const SVG_W = Math.ceil(totalWidth) + PAD_X * 2;
const SVG_H = FONT_SIZE + PAD_Y * 2;

// baseline so caps sit centered vertically
const capHeight = (font.tables.os2.sCapHeight / font.unitsPerEm) * FONT_SIZE;
const baseline = PAD_Y + capHeight + (SVG_H - PAD_Y * 2 - capHeight) / 2;

// --- collect per-glyph info ---
const glyphs = [];
let cx = PAD_X;
for (let i = 0; i < TEXT.length; i++) {
  const ch = TEXT[i];
  const g = font.charToGlyph(ch);
  const adv = (g.advanceWidth / font.unitsPerEm) * FONT_SIZE;
  const pathData = g.getPath(cx, baseline, FONT_SIZE);
  const svgPath = pathData.toSVG(2);
  // bounding box at this position
  const bb = pathData.getBoundingBox();
  glyphs.push({ ch, x: cx, adv, svgPath, bb });
  cx += adv + LETTER_SPACING;
}

// --- stencil cut helper ---
// Returns SVG <rect> that masks a horizontal stripe through a glyph
// We subtract a thin horizontal band at a fraction of the glyph height
function stencilCut(g, yFrac, cutH = 5) {
  const top = g.bb.y1;
  const bottom = g.bb.y2;
  const height = bottom - top;
  const cy = top + height * yFrac;
  return { x: g.bb.x1 - 0.5, y: cy - cutH / 2, w: g.bb.x2 - g.bb.x1 + 1, h: cutH };
}

// D — cut at 50% of glyph height (bridges the counter to the outer frame)
const D = glyphs.find(g => g.ch === 'D');
// P — cut at 65% (bottom of bowl, where it meets the stem)
const P = glyphs.find(g => g.ch === 'P');
// A — in Chakra Petch A has no enclosed counter (flat-top, open), skip

const cuts = [];
if (D) cuts.push(stencilCut(D, 0.50, 5));
if (P) cuts.push(stencilCut(P, 0.65, 5));

function buildSVG(bgColor, textColor) {
  const allPaths = glyphs.map(g => `<path d="${g.svgPath.match(/d="([^"]+)"/)?.[1] || ''}" fill="${textColor}"/>`).join('\n  ');
  const bgRect = bgColor ? `<rect width="${SVG_W}" height="${SVG_H}" fill="${bgColor}"/>` : '';

  // stencil cuts rendered as bg-color rectangles on top of the text
  const cutColor = bgColor || (textColor === '#3B3B3B' ? '#FFFFFF' : '#000000');
  const cutRects = cuts.map(c =>
    `<rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${c.w.toFixed(1)}" height="${c.h.toFixed(1)}" fill="${cutColor}"/>`
  ).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">
  ${bgRect}
  ${allPaths}
  ${cutRects}
</svg>`.trim();
}

const outDir = path.resolve('exports');
fs.mkdirSync(outDir, { recursive: true });

const darkSVG = buildSVG(null, '#3B3B3B');
fs.writeFileSync(path.join(outDir, 'duplia-logo.svg'), darkSVG);
console.log('Written: exports/duplia-logo.svg', `(${SVG_W}x${SVG_H})`);

const negSVG = buildSVG('#111111', '#FFFFFF');
fs.writeFileSync(path.join(outDir, 'duplia-logo-negative.svg'), negSVG);
console.log('Written: exports/duplia-logo-negative.svg', `(${SVG_W}x${SVG_H})`);
