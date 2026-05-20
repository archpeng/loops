function publicUrl(path) {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
  const normalizedPath = path.replace(/^\/+/, '');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return `${base}${encodedPath}`;
}

class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['filename', 'name', 'scientific-name', 'caption', 'color', 'features', 'image-src'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  _onClick() {
    this.dispatchEvent(new CustomEvent('select-plant', {
      bubbles: true,
      composed: true,
      detail: {
        filename: this.getAttribute('filename'),
        name: this.getAttribute('name'),
        scientificName: this.getAttribute('scientific-name'),
        caption: this.getAttribute('caption'),
        color: this.getAttribute('color'),
        features: this.getAttribute('features'),
        imageSrc: this.getAttribute('image-src')
      }
    }));
  }

  _onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onClick();
    }
  }

  render() {
    const filename = this.getAttribute('filename') || '';
    const name = this.getAttribute('name') || '';
    const scientificName = this.getAttribute('scientific-name') || '';
    const caption = this.getAttribute('caption') || '';
    const color = this.getAttribute('color') || '#ffffff';
    const features = this.getAttribute('features') || '';

    const imageUrl = this.getAttribute('image-src') || publicUrl(`photos/${filename}`);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .card {
          color: var(--color-ink);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: 100%;
          outline: none;
          padding: var(--space-3);
          background: var(--color-paper);
          border: var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-small);
          transform: translate(0, 0);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .card:hover {
          transform: translate(3px, 3px);
          box-shadow: 1px 1px 0 var(--color-line);
        }

        .card:focus-visible {
          outline: 4px solid var(--color-purple);
          outline-offset: 4px;
        }

        .image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border: 3px solid var(--color-line);
          border-radius: 6px;
          background-color: ${color};
          overflow: hidden;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .title-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .name {
          font-size: 1.08rem;
          font-weight: 950;
          color: var(--color-ink);
          line-height: 1.25;
        }

        .scientific-name {
          font-size: 0.82rem;
          font-style: italic;
          font-weight: 800;
          color: var(--color-muted);
          word-break: break-word;
        }

        .caption {
          font-size: 0.9rem;
          line-height: 1.65;
          color: var(--color-muted);
          font-weight: 700;
        }
      </style>
      <div class="card" tabindex="0" role="button" aria-label="查看植物 ${name} 的详细信息">
        <div class="image-container">
          <img src="${imageUrl}" alt="${name}" loading="lazy">
        </div>
        <div class="content">
          <div class="title-row">
            <span class="name">${name}</span>
            ${scientificName ? `<span class="scientific-name">${scientificName}</span>` : ''}
          </div>
          <p class="caption">${caption}</p>
        </div>
      </div>
    `;
  }
}

customElements.define('plant-card', PlantCard);
