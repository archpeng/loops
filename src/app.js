import './components/plant-card.js';
import './components/plant-detail.js';

const FLOWUS_PAGES = {
  rooms: {
    route: 'rooms',
    title: '认识我们的客房',
    label: 'Loopvill Rooms',
    dataPath: 'flowus/rooms.json',
    rootId: 'bb985f95-438d-4080-865a-3e386fe2902f'
  },
  garden: {
    route: 'garden',
    title: '认识我们的花园',
    label: 'Loopvill Garden',
    dataPath: 'flowus/garden.json',
    rootId: '3bd8dd22-f640-420a-b9d8-b8434e479c37'
  }
};

const ROUTES = new Set(['home', 'rooms', 'garden', 'plants']);
const app = document.getElementById('app');

let plants = [];
let plantsLoaded = false;
let photoManifest = {};
let flowusMediaManifest = {};
let renderToken = 0;

const flowusDocCache = {};

function publicUrl(path) {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
  const normalizedPath = path.replace(/^\/+/, '');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return `${base}${encodedPath}`;
}

function imageUrl(filename) {
  const optimized = photoManifest[filename]?.optimized;
  return publicUrl(optimized || `photos/${filename}`);
}

function flowusMediaUrl(ossName) {
  const localMedia = flowusMediaManifest[ossName]?.src;
  return localMedia ? publicUrl(localMedia) : '';
}

async function loadPhotoManifest() {
  try {
    const res = await fetch(publicUrl('photos-manifest.json'));
    if (!res.ok) throw new Error('Photo manifest not found');
    const data = await res.json();
    photoManifest = data.images || {};
  } catch (err) {
    console.warn('Photo manifest unavailable, using original images.', err);
    photoManifest = {};
  }
}

async function loadFlowusMediaManifest() {
  try {
    const res = await fetch(publicUrl('flowus-media/manifest.json'));
    if (!res.ok) throw new Error('Flowus media manifest not found');
    const data = await res.json();
    flowusMediaManifest = data.images || {};
  } catch (err) {
    console.warn('Flowus media manifest unavailable.', err);
    flowusMediaManifest = {};
  }
}

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
  return ROUTES.has(hash) ? hash : 'home';
}

function setViewClass(viewClass) {
  document.body.classList.remove('home-view', 'flowus-view', 'plant-view');
  document.body.classList.add(viewClass);
}

function render() {
  const route = getRoute();
  const token = ++renderToken;

  if (route === 'plants') {
    renderPlantPage();
    return;
  }

  if (route === 'rooms' || route === 'garden') {
    renderFlowusPage(route, token);
    return;
  }

  renderHomePage();
}

function renderHomePage() {
  setViewClass('home-view');
  document.title = 'Loopvill | 客房 花园 植物';

  app.innerHTML = `
    <main class="home-shell">
      <header class="home-header">
        <p class="eyebrow">Loopvill</p>
        <h1>在一处房子里，慢慢认识自然。</h1>
      </header>

      <nav class="home-grid" aria-label="主页栏目">
        <a class="home-link home-link-rooms" href="#rooms">
          <img src="${imageUrl('办公室门口.jpg')}" alt="客房入口">
          <span class="home-link-meta">01 / Rooms</span>
          <h2>认识我们的客房</h2>
          <p>房间、窗景、尺度与停留的方式。</p>
        </a>

        <a class="home-link home-link-garden" href="#garden">
          <img src="${imageUrl('秘境走廊.jpg')}" alt="花园走廊">
          <span class="home-link-meta">02 / Garden</span>
          <h2>认识我们的花园</h2>
          <p>路径、水边、树影与季节留下的痕迹。</p>
        </a>

        <a class="home-link home-link-plants" href="#plants">
          <img src="${imageUrl('蓝色绣球花.jpg')}" alt="蓝色绣球花">
          <span class="home-link-meta">03 / Plants</span>
          <h2>认识我们的植物</h2>
          <p>植物名录、照片与每一株的简短介绍。</p>
        </a>
      </nav>
    </main>
  `;
}

async function loadFlowusDoc(page) {
  if (flowusDocCache[page.route]) return flowusDocCache[page.route];

  const res = await fetch(publicUrl(page.dataPath));
  if (!res.ok) throw new Error(`${page.title} data not found`);
  const payload = await res.json();
  flowusDocCache[page.route] = payload;
  return payload;
}

async function renderFlowusPage(route, token) {
  const page = FLOWUS_PAGES[route];
  setViewClass('flowus-view');
  document.title = `${page.title} | Loopvill`;

  app.innerHTML = `
    <main class="flowus-shell">
      <a class="back-link" href="#" aria-label="返回主页">返回主页</a>
      <div class="empty-state">
        <span class="loading-spinner" aria-hidden="true"></span>
        <p>${page.title}加载中</p>
      </div>
    </main>
  `;

  try {
    const payload = await loadFlowusDoc(page);
    if (token !== renderToken || getRoute() !== route) return;

    const blocks = payload.data?.blocks || payload.blocks || {};
    const root = blocks[page.rootId];
    if (!root) throw new Error(`${page.title} root block missing`);

    const title = segmentsToText(root.data?.segments) || page.title;
    const cover = flowusMediaUrl(root.data?.cover);
    const content = (root.subNodes || [])
      .map((id) => renderFlowusBlock(blocks[id], blocks))
      .filter(Boolean)
      .join('');

    app.innerHTML = `
      <main class="flowus-shell">
        <a class="back-link" href="#" aria-label="返回主页">返回主页</a>

        <header class="flowus-hero">
          <div class="flowus-hero-media">
            ${cover ? `<img src="${cover}" alt="${escapeAttr(title)}" loading="eager">` : ''}
          </div>
          <div class="flowus-hero-copy">
            <p class="eyebrow">${escapeHtml(page.label)}</p>
            <h1>${escapeHtml(title)}</h1>
          </div>
        </header>

        <article class="flowus-document">
          ${content || '<p class="flowus-text">页面内容暂时无法显示。</p>'}
        </article>
      </main>
    `;
  } catch (err) {
    console.error(`Error loading ${route} page:`, err);
    if (token !== renderToken) return;
    app.innerHTML = `
      <main class="flowus-shell">
        <a class="back-link" href="#" aria-label="返回主页">返回主页</a>
        <div class="empty-state">
          <p>${page.title}暂时无法加载</p>
        </div>
      </main>
    `;
  }
}

function renderFlowusBlock(block, blocks) {
  if (!block || block.status === 3) return '';

  if (block.type === 7) return renderFlowusHeading(block);
  if (block.type === 14) return renderFlowusMedia(block);
  if (block.type === 4) return renderFlowusListItem(block);
  if (block.type === 1) return renderFlowusText(block);

  if (block.subNodes?.length) {
    return block.subNodes.map((id) => renderFlowusBlock(blocks[id], blocks)).join('');
  }

  return '';
}

function renderFlowusHeading(block) {
  const level = Number(block.data?.level || 2);
  const html = renderSegments(block.data?.segments);
  if (!html) return '';

  const tag = level >= 3 ? 'h3' : 'h2';
  return `<${tag} class="flowus-heading flowus-heading-${level}">${html}</${tag}>`;
}

function renderFlowusText(block) {
  const html = renderSegments(block.data?.segments);
  if (!html) return '<div class="flowus-spacer" aria-hidden="true"></div>';

  const level = Number(block.data?.level || 0);
  const levelClass = level ? ` flowus-text-level-${level}` : '';
  return `<p class="flowus-text${levelClass}">${html}</p>`;
}

function renderFlowusListItem(block) {
  const html = renderSegments(block.data?.segments);
  if (!html) return '';
  return `<p class="flowus-list-item">${html}</p>`;
}

function renderFlowusMedia(block) {
  const data = block.data || {};
  const title = segmentsToText(data.segments) || block.title || '';

  if (data.display === 'image') {
    const src = flowusMediaUrl(data.ossName);
    const ratio = data.width && data.height ? ` style="--media-ratio: ${data.width} / ${data.height};"` : '';

    if (!src) {
      return `
        <figure class="flowus-media flowus-media-missing">
          <div class="flowus-media-placeholder">图片正在同步</div>
          ${title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ''}
        </figure>
      `;
    }

    return `
      <figure class="flowus-media"${ratio}>
        <img src="${src}" alt="${escapeAttr(title)}" loading="lazy">
      </figure>
    `;
  }

  if (data.display === 'video') {
    return `
      <figure class="flowus-video">
        <div class="flowus-video-placeholder">视频文件</div>
        ${title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ''}
      </figure>
    `;
  }

  return '';
}

function renderSegments(segments = []) {
  return segments.map(renderSegment).join('').trim();
}

function renderSegment(segment) {
  let html = escapeHtml(segment.text || '');
  const enhancer = segment.enhancer || {};
  if (!html) return '';

  if (enhancer.bold) html = `<strong>${html}</strong>`;
  if (enhancer.italic) html = `<em>${html}</em>`;
  if (enhancer.underline) html = `<u>${html}</u>`;
  if (enhancer.lineThrough) html = `<s>${html}</s>`;
  if (enhancer.code) html = `<code>${html}</code>`;

  const link = enhancer.link || enhancer.url;
  if (link) {
    html = `<a href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
  }

  return html;
}

function segmentsToText(segments = []) {
  return segments.map((segment) => segment.text || '').join('').trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}

function renderPlantPage() {
  setViewClass('plant-view');
  document.title = '认识我们的植物 | Loopvill';

  app.innerHTML = `
    <main class="plant-shell">
      <header class="plant-header">
        <a class="back-link" href="#" aria-label="返回主页">返回主页</a>
        <div>
          <p class="eyebrow">Loopvill Plants</p>
          <h1>认识我们的植物</h1>
        </div>
      </header>

      <section class="plant-toolbar" aria-label="搜索植物">
        <input
          type="search"
          id="search-input"
          class="search-input"
          placeholder="搜索植物名称、学名或配文"
          aria-label="输入植物名称搜索"
        >
        <div id="stats-badge" class="stats-badge" role="status" aria-live="polite">
          正在加载
        </div>
      </section>

      <section id="plant-feed" class="plant-feed" role="feed" aria-busy="true">
        <div class="empty-state">
          <span class="loading-spinner" aria-hidden="true"></span>
          <p>植物相册加载中</p>
        </div>
      </section>
    </main>
    <plant-detail id="plant-detail"></plant-detail>
  `;

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', handleSearch);

  if (plantsLoaded) {
    renderFeed(plants);
  } else {
    loadPlants();
  }
}

async function loadPlants() {
  const feedContainer = document.getElementById('plant-feed');

  try {
    const res = await fetch(publicUrl('data.json'));
    if (!res.ok) throw new Error('Data not found');
    const data = await res.json();
    plants = data.images || [];
    plantsLoaded = true;
    renderFeed(plants);
  } catch (err) {
    console.error('Error loading plant data:', err);
    if (!feedContainer) return;
    feedContainer.setAttribute('aria-busy', 'false');
    feedContainer.innerHTML = `
      <div class="empty-state">
        <p>植物照片数据暂时无法加载</p>
      </div>
    `;
  }
}

function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    renderFeed(plants);
    return;
  }

  const filtered = plants.filter((plant) => {
    const name = (plant.name || '').toLowerCase();
    const sciName = (plant.scientificName || '').toLowerCase();
    const caption = (plant.caption || '').toLowerCase();
    const features = (plant.features || '').toLowerCase();
    return (
      name.includes(query) ||
      sciName.includes(query) ||
      caption.includes(query) ||
      features.includes(query)
    );
  });

  renderFeed(filtered);
}

function renderFeed(items) {
  const feedContainer = document.getElementById('plant-feed');
  const statsBadge = document.getElementById('stats-badge');
  if (!feedContainer || !statsBadge) return;

  feedContainer.setAttribute('aria-busy', 'false');

  if (items.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <p>没有找到匹配的植物</p>
      </div>
    `;
    statsBadge.textContent = '共 0 个项目';
    return;
  }

  statsBadge.textContent = `共 ${items.length} 个项目`;
  feedContainer.innerHTML = '';

  items.forEach((plant) => {
    const card = document.createElement('plant-card');
    card.setAttribute('filename', plant.filename);
    card.setAttribute('name', plant.name);
    card.setAttribute('scientific-name', plant.scientificName || '');
    card.setAttribute('caption', plant.caption || '');
    card.setAttribute('color', plant.color || '#f5f4ef');
    card.setAttribute('features', plant.features || '');
    card.setAttribute('image-src', imageUrl(plant.filename));
    feedContainer.appendChild(card);
  });
}

document.addEventListener('select-plant', (e) => {
  const detailModal = document.getElementById('plant-detail');
  if (!detailModal) return;

  const data = e.detail;
  detailModal.setAttribute('filename', data.filename || '');
  detailModal.setAttribute('name', data.name || '');
  detailModal.setAttribute('scientific-name', data.scientificName || '');
  detailModal.setAttribute('caption', data.caption || '');
  detailModal.setAttribute('color', data.color || '#f5f4ef');
  detailModal.setAttribute('features', data.features || '');
  detailModal.setAttribute('image-src', data.imageSrc || imageUrl(data.filename || ''));
  detailModal.setAttribute('open', '');
});

window.addEventListener('hashchange', render);
Promise.all([loadPhotoManifest(), loadFlowusMediaManifest()]).finally(render);
