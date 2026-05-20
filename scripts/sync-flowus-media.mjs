import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const FLOWUS_DIR = path.join(ROOT, 'public', 'flowus');
const OUTPUT_DIR = path.join(ROOT, 'public', 'flowus-media');
const TMP_DIR = path.join(ROOT, '.tmp-flowus-media');
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'manifest.json');
const MAX_SIZE = Number(process.env.FLOWUS_IMAGE_MAX_SIZE || 1600);
const QUALITY = Number(process.env.FLOWUS_IMAGE_QUALITY || 82);
const REPROCESS = process.env.FLOWUS_REPROCESS === '1';
const CREATE_URLS_ENDPOINT = 'https://flowus.cn/api/file/create_urls';

const DOCUMENTS = [
  {
    name: 'rooms',
    file: 'rooms.json',
    rootId: 'bb985f95-438d-4080-865a-3e386fe2902f',
    referer: 'https://flowus.cn/bb985f95-438d-4080-865a-3e386fe2902f'
  },
  {
    name: 'garden',
    file: 'garden.json',
    rootId: '3bd8dd22-f640-420a-b9d8-b8434e479c37',
    referer: 'https://flowus.cn/3bd8dd22-f640-420a-b9d8-b8434e479c37'
  }
];

function isImageOssName(ossName = '') {
  return /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(ossName);
}

function filenameFromOssName(ossName) {
  const [, filename = 'image'] = ossName.match(/([^/]+)$/) || [];
  return filename;
}

function outputBase(asset) {
  const filename = filenameFromOssName(asset.ossName);
  const ext = path.extname(filename);
  const base = filename.slice(0, ext ? -ext.length : undefined);
  const safeBase = base
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'flowus-image';
  const hash = createHash('sha1').update(asset.ossName).digest('hex').slice(0, 10);
  return `${safeBase}-${hash}`;
}

function outputName(asset) {
  return `${outputBase(asset)}.jpg`;
}

function originalOutputName(asset) {
  const ext = path.extname(filenameFromOssName(asset.ossName)).toLowerCase() || '.jpg';
  return `${outputBase(asset)}${ext}`;
}

function collectAssets(documentConfig, payload) {
  const blocks = payload.data?.blocks || payload.blocks || {};
  const root = blocks[documentConfig.rootId];
  const assets = [];

  if (root?.data?.cover && isImageOssName(root.data.cover)) {
    assets.push({
      document: documentConfig.name,
      blockId: root.uuid,
      ossName: root.data.cover,
      title: `${documentConfig.name}-cover`,
      display: 'image',
      role: 'cover',
      width: root.data.width,
      height: root.data.height
    });
  }

  for (const block of Object.values(blocks)) {
    const data = block.data || {};
    if (block.type !== 14 || data.display !== 'image' || !data.ossName) continue;
    if (!isImageOssName(data.ossName)) continue;
    assets.push({
      document: documentConfig.name,
      blockId: block.uuid,
      ossName: data.ossName,
      title: block.title || filenameFromOssName(data.ossName),
      display: data.display,
      role: 'block',
      width: data.width,
      height: data.height
    });
  }

  return assets;
}

function dedupeAssets(assets) {
  const seen = new Map();
  for (const asset of assets) {
    if (!seen.has(asset.ossName)) {
      seen.set(asset.ossName, asset);
      continue;
    }
    const existing = seen.get(asset.ossName);
    existing.document = [existing.document, asset.document].filter(Boolean).join(',');
  }
  return [...seen.values()];
}

async function readFlowusDocuments() {
  const assets = [];

  for (const documentConfig of DOCUMENTS) {
    const file = path.join(FLOWUS_DIR, documentConfig.file);
    const payload = JSON.parse(await fs.readFile(file, 'utf8'));
    assets.push(...collectAssets(documentConfig, payload));
  }

  return dedupeAssets(assets);
}

async function createSignedUrls(assets) {
  const signedUrls = new Map();
  const batchSize = 10;

  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    const referer = DOCUMENTS.find((doc) => doc.name === batch[0]?.document)?.referer || DOCUMENTS[0].referer;
    const res = await fetch(CREATE_URLS_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        referer,
        'user-agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        batch: batch.map((asset) => ({
          blockId: asset.blockId,
          ossName: asset.ossName,
          isPublic: true
        }))
      })
    });

    if (!res.ok) {
      throw new Error(`Flowus signed URL request failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== 200 || !Array.isArray(data.data)) {
      throw new Error(`Flowus signed URL response was not usable: ${JSON.stringify(data).slice(0, 200)}`);
    }

    data.data.forEach((item, index) => {
      if (item?.url) signedUrls.set(batch[index].ossName, item.url);
    });
  }

  return signedUrls;
}

async function fileSize(file) {
  const stat = await fs.stat(file);
  return stat.size;
}

async function downloadFile(url, target) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0'
    }
  });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(target, buffer);
  return buffer.length;
}

async function optimizeAsset(asset, signedUrl) {
  const targetName = outputName(asset);
  const target = path.join(OUTPUT_DIR, targetName);
  const originalTargetName = originalOutputName(asset);
  const originalTarget = path.join(OUTPUT_DIR, originalTargetName);

  if (!REPROCESS) {
    for (const [candidateName, candidate] of [[targetName, target], [originalTargetName, originalTarget]]) {
      try {
        const existingBytes = await fileSize(candidate);
        return {
          src: `flowus-media/${candidateName}`,
          optimizedBytes: existingBytes,
          skipped: true
        };
      } catch {
        // Generate below.
      }
    }
  }

  const tmpFile = path.join(TMP_DIR, `${createHash('sha1').update(asset.ossName).digest('hex')}${path.extname(filenameFromOssName(asset.ossName)) || '.jpg'}`);
  const originalBytes = await downloadFile(signedUrl, tmpFile);

  await execFileAsync('sips', [
    '-Z',
    String(MAX_SIZE),
    '-s',
    'format',
    'jpeg',
    '-s',
    'formatOptions',
    String(QUALITY),
    tmpFile,
    '--out',
    target
  ]);

  const optimizedBytes = await fileSize(target);

  if (optimizedBytes >= originalBytes) {
    await fs.rm(target, { force: true });
    await fs.rename(tmpFile, originalTarget);
    return {
      src: `flowus-media/${originalTargetName}`,
      originalBytes,
      optimizedBytes: originalBytes,
      skipped: false,
      keptOriginal: true
    };
  }

  if (originalTarget !== target) {
    await fs.rm(originalTarget, { force: true });
  }
  await fs.rm(tmpFile, { force: true });

  return {
    src: `flowus-media/${targetName}`,
    originalBytes,
    optimizedBytes,
    skipped: false
  };
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(TMP_DIR, { recursive: true });

const assets = await readFlowusDocuments();
const signedUrls = await createSignedUrls(assets);
const manifest = {};
let originalTotal = 0;
let optimizedTotal = 0;

for (const asset of assets) {
  const signedUrl = signedUrls.get(asset.ossName);
  if (!signedUrl) {
    console.warn(`No signed URL for ${asset.ossName}`);
    continue;
  }

  try {
    const result = await optimizeAsset(asset, signedUrl);
    const originalBytes = result.originalBytes || result.optimizedBytes;
    originalTotal += originalBytes;
    optimizedTotal += result.optimizedBytes;
    manifest[asset.ossName] = {
      src: result.src,
      title: asset.title,
      display: asset.display,
      role: asset.role,
      document: asset.document,
      width: asset.width,
      height: asset.height,
      originalBytes,
      optimizedBytes: result.optimizedBytes
    };
    const ratio = ((1 - result.optimizedBytes / originalBytes) * 100).toFixed(1);
    const prefix = result.keptOriginal || result.skipped ? 'kept' : 'optimized';
    console.log(`${prefix} ${filenameFromOssName(asset.ossName)}: ${(originalBytes / 1024 / 1024).toFixed(1)}MB -> ${(result.optimizedBytes / 1024 / 1024).toFixed(1)}MB (${ratio}% smaller)`);
  } catch (err) {
    console.warn(`Failed to process ${asset.ossName}: ${err.message}`);
  }
}

await fs.rm(TMP_DIR, { recursive: true, force: true });

const summary = {
  generatedAt: new Date().toISOString(),
  maxSize: MAX_SIZE,
  quality: QUALITY,
  count: Object.keys(manifest).length,
  originalBytes: originalTotal,
  optimizedBytes: optimizedTotal,
  savingsPercent: originalTotal ? Number(((1 - optimizedTotal / originalTotal) * 100).toFixed(1)) : 0,
  images: manifest
};

await fs.writeFile(MANIFEST_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log(`Synced ${summary.count} Flowus images.`);
console.log(`Total: ${(originalTotal / 1024 / 1024).toFixed(1)}MB -> ${(optimizedTotal / 1024 / 1024).toFixed(1)}MB (${summary.savingsPercent}% smaller)`);
