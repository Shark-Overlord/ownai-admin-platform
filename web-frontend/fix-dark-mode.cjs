const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  // Base background and surface colors
  content = content.replace(/bg-white/g, 'bg-[var(--hero-surface)]');
  content = content.replace(/bg-\[\#fbfcfe\]/g, 'bg-[var(--hero-surface)]');
  content = content.replace(/bg-\[\#f5f6f8\]/g, 'bg-[var(--hero-surface)]');
  content = content.replace(/bg-\[\#eef2f7\]/g, 'bg-[var(--hero-panel)]');
  content = content.replace(/bg-\[\#f5f7fb\]/g, 'bg-[var(--hero-panel)]');

  // Ink (Black) background and text
  content = content.replace(/bg-\[\#111111\]/g, 'bg-[var(--hero-ink)]');
  content = content.replace(/text-\[\#111111\]/g, 'text-[var(--hero-ink)]');
  content = content.replace(/text-\[\#111\]/g, 'text-[var(--hero-ink)]');

  // Dark text on ink background needs to invert to hero-bg
  content = content.replace(/text-white/g, 'text-[var(--hero-bg)]');
  // Revert specific text-white that shouldn't change (e.g. text-white/95 in SiteCard)
  content = content.replace(/text-\[var\(--hero-bg\)\]\/95/g, 'text-white/95');

  // Borders, rings, backgrounds with opacity black
  content = content.replace(/border-black\//g, 'border-[var(--hero-ink)]/');
  content = content.replace(/ring-black\//g, 'ring-[var(--hero-ink)]/');
  content = content.replace(/bg-black\//g, 'bg-[var(--hero-ink)]/');
  content = content.replace(/text-black\//g, 'text-[var(--hero-ink)]/');

  // Specific grey borders
  content = content.replace(/border-\[\#e5e7eb\]/g, 'border-[var(--hero-border)]');
  content = content.replace(/border-\[\#d1d5db\]/g, 'border-[var(--hero-border-strong)]');
  content = content.replace(/border-\[\#dde1e6\]/g, 'border-[var(--hero-border)]');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
