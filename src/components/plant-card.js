class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['filename', 'name', 'scientific-name', 'caption', 'color'];
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
        features: this.getAttribute('features')
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

    // Encode filename for URL
    const imageUrl = `/photos/${encodeURIComponent(filename)}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .card {
          background-color: var(--card-color, ${color});
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-hard-md);
          overflow: hidden;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          cursor: pointer;
          outline: none;
          display: flex;
          flex-direction: column;
        }

        .card:hover {
          box-shadow: var(--shadow-hard-lg);
          transform: translate(-2px, -2px);
        }

        .card:focus-visible {
          box-shadow: var(--shadow-hard-lg);
          border-color: var(--color-dark);
          transform: translate(-4px, -4px);
        }

        .card:active {
          box-shadow: var(--shadow-hard-sm);
          transform: translate(2px, 2px);
        }

        .image-container {
          position: relative;
          width: 100%;
          height: 220px;
          border-bottom: var(--border-w-thick) solid var(--color-dark);
          background-color: var(--color-bg);
          overflow: hidden;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }

        .card:hover .image-container img {
          transform: scale(1.05);
        }

        .content {
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .title-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .name {
          font-size: 1.4rem;
          font-weight: var(--font-weight-black);
          color: var(--color-dark);
          line-height: 1.2;
        }

        .scientific-name {
          font-size: 0.85rem;
          font-style: italic;
          font-weight: var(--font-weight-bold);
          color: rgba(0, 0, 0, 0.6);
          word-break: break-word;
        }

        .caption {
          font-size: 0.95rem;
          font-weight: var(--font-weight-bold);
          line-height: 1.4;
          margin-top: var(--spacing-xs);
          padding: var(--spacing-sm);
          background: var(--color-white);
          border: var(--border-w-thin) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-hard-sm);
          color: var(--color-dark);
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
