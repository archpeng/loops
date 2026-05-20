import './components/plant-card.js';
import './components/plant-detail.js';

let plants = [];

const feedContainer = document.getElementById('plant-feed');
const searchInput = document.getElementById('search-input');
const statsBadge = document.getElementById('stats-badge');
const detailModal = document.getElementById('plant-detail');

// Fetch the data.json file
async function loadPlants() {
  try {
    const res = await fetch('/data.json');
    if (!res.ok) throw new Error('Data not found');
    const data = await res.json();
    plants = data.images || [];
    renderFeed(plants);
  } catch (err) {
    console.error('Error loading plant data:', err);
    feedContainer.innerHTML = `
      <div class="empty-state">
        <div class="loading-spinner"></div>
        <p>植物照片正在由 Gemini AI 识别中...</p>
        <p style="font-size: 0.85rem; margin-top: 8px; color: #666; font-weight: normal;">这可能需要几分钟，请稍后刷新页面查看最新进度。</p>
      </div>
    `;
    // Try to reload in 5 seconds
    setTimeout(loadPlants, 5000);
  }
}

function renderFeed(items) {
  if (items.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <p>没有找到匹配的植物 🌿</p>
      </div>
    `;
    statsBadge.textContent = '共 0 个项目';
    return;
  }

  statsBadge.textContent = `共 ${items.length} 个项目`;
  feedContainer.innerHTML = '';

  items.forEach(plant => {
    const card = document.createElement('plant-card');
    card.setAttribute('filename', plant.filename);
    card.setAttribute('name', plant.name);
    card.setAttribute('scientific-name', plant.scientificName || '');
    card.setAttribute('caption', plant.caption || '');
    card.setAttribute('color', plant.color || '#FFF5E4');
    card.setAttribute('features', plant.features || '');
    feedContainer.appendChild(card);
  });
}

// Handle search input
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    renderFeed(plants);
    return;
  }

  const filtered = plants.filter(plant => {
    const name = (plant.name || '').toLowerCase();
    const sciName = (plant.scientificName || '').toLowerCase();
    const caption = (plant.caption || '').toLowerCase();
    return name.includes(query) || sciName.includes(query) || caption.includes(query);
  });
  renderFeed(filtered);
});

// Listen for custom element selection event
document.addEventListener('select-plant', (e) => {
  const data = e.detail;
  detailModal.setAttribute('filename', data.filename);
  detailModal.setAttribute('name', data.name);
  detailModal.setAttribute('scientific-name', data.scientificName);
  detailModal.setAttribute('caption', data.caption);
  detailModal.setAttribute('color', data.color);
  detailModal.setAttribute('features', data.features);
  detailModal.setAttribute('open', '');
});

// Initial load
loadPlants();
