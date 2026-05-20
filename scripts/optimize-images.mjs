import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'public', 'photos');
const OUTPUT_DIR = path.join(ROOT, 'public', 'photos-optimized');
const MANIFEST_FILE = path.join(ROOT, 'public', 'photos-manifest.json');
const MAX_SIZE = Number(process.env.IMAGE_MAX_SIZE || 1600);
const QUALITY = Number(process.env.IMAGE_QUALITY || 82);

function isImage(filename) {
  return /\.(jpe?g|png)$/i.test(filename);
}

function outputName(filename) {
  const ext = path.extname(filename);
  const base = filename.slice(0, -ext.length);
  const hash = createHash('sha1').update(filename).digest('hex').slice(0, 10);
  return `${base}-${hash}.jpg`;
}

async function fileSize(file) {
  const stat = await fs.stat(file);
  return stat.size;
}

async function optimizeImage(filename) {
  const source = path.join(SOURCE_DIR, filename);
  const targetName = outputName(filename);
  const target = path.join(OUTPUT_DIR, targetName);
  const originalBytes = await fileSize(source);

  await execFileAsync('sips', [
    '-Z',
    String(MAX_SIZE),
    '-s',
    'format',
    'jpeg',
    '-s',
    'formatOptions',
    String(QUALITY),
    source,
    '--out',
    target
  ]);

  const compressedBytes = await fileSize(target);
  if (compressedBytes >= originalBytes) {
    await fs.rm(target, { force: true });
    return {
      original: `photos/${filename}`,
      optimized: `photos/${filename}`,
      originalBytes,
      optimizedBytes: originalBytes,
      keptOriginal: true
    };
  }

  return {
    original: `photos/${filename}`,
    optimized: `photos-optimized/${targetName}`,
    originalBytes,
    optimizedBytes: compressedBytes,
    keptOriginal: false
  };
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const files = (await fs.readdir(SOURCE_DIR))
  .filter(isImage)
  .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

const manifest = {};
let originalTotal = 0;
let optimizedTotal = 0;

for (const filename of files) {
  const result = await optimizeImage(filename);
  manifest[filename] = result;
  originalTotal += result.originalBytes;
  optimizedTotal += result.optimizedBytes;
  const ratio = ((1 - result.optimizedBytes / result.originalBytes) * 100).toFixed(1);
  console.log(`${filename}: ${(result.originalBytes / 1024 / 1024).toFixed(1)}MB -> ${(result.optimizedBytes / 1024 / 1024).toFixed(1)}MB (${ratio}% smaller)`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  maxSize: MAX_SIZE,
  quality: QUALITY,
  count: files.length,
  originalBytes: originalTotal,
  optimizedBytes: optimizedTotal,
  savingsPercent: Number(((1 - optimizedTotal / originalTotal) * 100).toFixed(1)),
  images: manifest
};

await fs.writeFile(MANIFEST_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log(`Optimized ${files.length} images.`);
console.log(`Total: ${(originalTotal / 1024 / 1024).toFixed(1)}MB -> ${(optimizedTotal / 1024 / 1024).toFixed(1)}MB (${summary.savingsPercent}% smaller)`);
