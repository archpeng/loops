function publicUrl(path) {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
  const normalizedPath = path.replace(/^\/+/, '');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return `${base}${encodedPath}`;
}

class PlantDetail extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._onBackdropClick = this._onBackdropClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  static get observedAttributes() {
    return ['open', 'filename', 'name', 'scientific-name', 'caption', 'color', 'features', 'image-src'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this._isOpen = newValue !== null;
      this.toggleModal();
      return;
    }

    this.render();
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.addEventListener('click', this._onBackdropClick);
    window.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('click', this._onBackdropClick);
    window.removeEventListener('keydown', this._onKeyDown);
  }

  _onBackdropClick(e) {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');

    if (e.target === backdrop || e.target === closeBtn || closeBtn?.contains(e.target)) {
      this.close();
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape' && this._isOpen) {
      this.close();
    }
  }

  close() {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('close-detail', {
      bubbles: true,
      composed: true
    }));
  }

  toggleModal() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    if (!backdrop) return;

    if (this._isOpen) {
      backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
      setTimeout(() => this.shadowRoot.querySelector('.close-btn')?.focus(), 50);
    } else {
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  render() {
    const filename = this.getAttribute('filename') || '';
    const name = this.getAttribute('name') || '';
    const scientificName = this.getAttribute('scientific-name') || '';
    const caption = this.getAttribute('caption') || '';
    const color = this.getAttribute('color') || '#f5f4ef';
    const features = this.getAttribute('features') || '';
    const imageUrl = this.getAttribute('image-src') || publicUrl(`photos/${filename}`);

    this.shadowRoot.innerHTML = `
      <style>
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: end center;
          background: rgba(18, 18, 18, 0.52);
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease;
        }

        .modal-backdrop.show {
          opacity: 1;
          pointer-events: auto;
        }

        .dialog-container {
          width: min(100%, 720px);
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--color-paper);
          border: var(--border);
          border-bottom: 0;
          border-radius: var(--radius) var(--radius) 0 0;
          box-shadow: 0 -8px 0 var(--color-line);
          transform: translateY(24px);
          transition: transform 180ms ease;
        }

        .modal-backdrop.show .dialog-container {
          transform: translateY(0);
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-5);
          border-bottom: 4px solid var(--color-line);
          box-shadow: inset 12px 0 0 ${color};
        }

        .dialog-title {
          font-size: clamp(1.35rem, 5vw, 2.4rem);
          font-weight: 950;
          line-height: 1.15;
          color: var(--color-ink);
        }

        .close-btn {
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          border: 3px solid var(--color-line);
          border-radius: var(--radius);
          background: var(--color-primary);
          color: var(--color-ink);
          font-size: 1.4rem;
          font-weight: 950;
          line-height: 1;
          cursor: pointer;
          box-shadow: var(--shadow-small);
        }

        .close-btn:hover,
        .close-btn:focus-visible {
          background: var(--color-accent);
          outline: none;
        }

        .dialog-content {
          padding: var(--space-5);
          overflow-y: auto;
          display: grid;
          gap: var(--space-5);
          padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
        }

        .image-wrapper {
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border-radius: var(--radius);
          background: var(--color-accent);
          border: 3px solid var(--color-line);
        }

        .image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .plant-names,
        .text-block {
          display: grid;
          gap: var(--space-2);
          padding: var(--space-4);
          background: #ffffff;
          border: 3px solid var(--color-line);
          border-radius: var(--radius);
          box-shadow: var(--shadow-small);
        }

        .name-label {
          font-size: 1.1rem;
          font-weight: 950;
          color: var(--color-ink);
        }

        .latin-label {
          font-size: 0.9rem;
          font-style: italic;
          font-weight: 800;
          color: var(--color-muted);
        }

        .section-label {
          font-size: 0.78rem;
          letter-spacing: 0;
          text-transform: uppercase;
          color: var(--color-muted);
          font-weight: 950;
        }

        .body-text {
          margin: 0;
          font-size: 0.96rem;
          line-height: 1.8;
          color: var(--color-muted);
          font-weight: 700;
        }
      </style>

      <div class="modal-backdrop ${this._isOpen ? 'show' : ''}" role="dialog" aria-modal="true" aria-label="${name} 详情">
        <article class="dialog-container">
          <header class="dialog-header">
            <span class="dialog-title">${name}</span>
            <button class="close-btn" aria-label="关闭详情窗口" type="button">×</button>
          </header>

          <div class="dialog-content">
            <div class="image-wrapper">
              <img src="${imageUrl}" alt="${name}">
            </div>

            <section class="plant-names">
              <div class="name-label">${name}</div>
              ${scientificName ? `<div class="latin-label">${scientificName}</div>` : ''}
            </section>

            <section class="text-block">
              <span class="section-label">Caption</span>
              <p class="body-text">${caption}</p>
            </section>

            <section class="text-block">
              <span class="section-label">Features</span>
              <p class="body-text">${features}</p>
            </section>
          </div>
        </article>
      </div>
    `;

    this.toggleModal();
  }
}

customElements.define('plant-detail', PlantDetail);
