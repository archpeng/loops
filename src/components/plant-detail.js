class PlantDetail extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
  }

  static get observedAttributes() {
    return ['open', 'filename', 'name', 'scientific-name', 'caption', 'color', 'features'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this._isOpen = newValue !== null;
      this.toggleModal();
    } else {
      this.render();
    }
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.addEventListener('click', this._onBackdropClick.bind(this));
    window.addEventListener('keydown', this._onKeyDown.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown.bind(this));
  }

  _onBackdropClick(e) {
    const dialog = this.shadowRoot.querySelector('.dialog-container');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    if (e.target === this.shadowRoot.querySelector('.modal-backdrop') || e.target === closeBtn || closeBtn.contains(e.target)) {
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
    if (backdrop) {
      if (this._isOpen) {
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
        // Focus the close button for accessibility
        setTimeout(() => {
          const closeBtn = this.shadowRoot.querySelector('.close-btn');
          if (closeBtn) closeBtn.focus();
        }, 50);
      } else {
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
      }
    }
  }

  render() {
    const filename = this.getAttribute('filename') || '';
    const name = this.getAttribute('name') || '';
    const scientificName = this.getAttribute('scientific-name') || '';
    const caption = this.getAttribute('caption') || '';
    const color = this.getAttribute('color') || '#ffffff';
    const features = this.getAttribute('features') || '';

    const imageUrl = `/photos/${encodeURIComponent(filename)}`;

    this.shadowRoot.innerHTML = `
      <style>
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: flex-end;
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .modal-backdrop.show {
          opacity: 1;
          pointer-events: auto;
        }

        .dialog-container {
          background-color: var(--color-bg);
          border-top: var(--border-w-thick) solid var(--color-dark);
          border-left: var(--border-w-thick) solid var(--color-dark);
          border-right: var(--border-w-thick) solid var(--color-dark);
          border-top-left-radius: var(--border-radius-lg);
          border-top-right-radius: var(--border-radius-lg);
          width: 100%;
          max-width: 600px;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0px -8px 0px var(--color-dark);
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }

        .modal-backdrop.show .dialog-container {
          transform: translateY(0);
        }

        /* Header block of the dialog */
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background-color: ${color};
          border-bottom: var(--border-w-thick) solid var(--color-dark);
          border-top-left-radius: calc(var(--border-radius-lg) - 4px);
          border-top-right-radius: calc(var(--border-radius-lg) - 4px);
        }

        .dialog-title {
          font-size: 1.5rem;
          font-weight: var(--font-weight-black);
          color: var(--color-dark);
          line-height: 1.1;
        }

        .close-btn {
          width: 44px;
          height: 44px;
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          background-color: var(--color-secondary);
          color: var(--color-dark);
          font-size: 1.5rem;
          font-weight: var(--font-weight-black);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-hard-sm);
          transition: var(--transition-fast);
          outline: none;
        }

        .close-btn:hover, .close-btn:focus-visible {
          transform: translate(-1px, -1px);
          box-shadow: var(--shadow-hard-md);
        }

        .close-btn:active {
          transform: translate(1px, 1px);
          box-shadow: none;
        }

        /* Content block */
        .dialog-content {
          padding: var(--spacing-md);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding-bottom: calc(var(--spacing-xl) + env(safe-area-inset-bottom));
        }

        .image-wrapper {
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-hard-md);
          aspect-ratio: 4 / 3;
          background-color: var(--color-white);
        }

        .image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .plant-names {
          background-color: var(--color-white);
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-hard-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .name-label {
          font-size: 1.6rem;
          font-weight: var(--font-weight-black);
          color: var(--color-dark);
        }

        .latin-label {
          font-size: 0.95rem;
          font-style: italic;
          font-weight: var(--font-weight-bold);
          color: rgba(0, 0, 0, 0.6);
        }

        .info-card {
          background-color: var(--color-white);
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-hard-md);
        }

        .info-title {
          font-size: 1.1rem;
          font-weight: var(--font-weight-black);
          margin-bottom: var(--spacing-sm);
          background-color: var(--color-accent);
          display: inline-block;
          padding: 2px var(--spacing-sm);
          border: var(--border-w-thin) solid var(--color-dark);
          box-shadow: var(--shadow-hard-sm);
          transform: rotate(-1deg);
        }

        .info-text {
          font-size: 0.95rem;
          line-height: 1.6;
          font-weight: var(--font-weight-medium);
          color: var(--color-dark);
        }

        .caption-card {
          background-color: var(--color-white);
          border: var(--border-w-thick) solid var(--color-dark);
          border-radius: var(--border-radius-md);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-hard-md);
          border-left: 12px solid var(--color-primary); /* Neo-Brutalist blockquote */
        }

        .caption-text {
          font-size: 1.05rem;
          font-weight: var(--font-weight-bold);
          line-height: 1.5;
          color: var(--color-dark);
          position: relative;
        }
      </style>
      
      <div class="modal-backdrop ${this._isOpen ? 'show' : ''}" role="dialog" aria-modal="true" aria-label="${name} 详情">
        <div class="dialog-container">
          <div class="dialog-header">
            <span class="dialog-title">${name}</span>
            <button class="close-btn" aria-label="关闭详情窗口" tabindex="0">×</button>
          </div>
          <div class="dialog-content">
            <div class="image-wrapper">
              <img src="${imageUrl}" alt="${name}">
            </div>
            
            <div class="plant-names">
              <div class="name-label">${name}</div>
              ${scientificName ? `<div class="latin-label">${scientificName}</div>` : ''}
            </div>

            <div class="caption-card">
              <p class="caption-text">“${caption}”</p>
            </div>

            <div class="info-card">
              <div class="info-title">植物特征</div>
              <p class="info-text">${features}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Wire up backdrop display and scrolling toggling
    this.toggleModal();
  }
}

customElements.define('plant-detail', PlantDetail);
