interface ProxyComponentConfig {
  src: string
  sessionId?: string
  mode: 'iframe' | 'ssr'
  cspLevel: 'permissive' | 'balanced' | 'strict'
  fallbackEnabled: boolean
}

export class ProxyViewerElement extends HTMLElement {
  private shadow: ShadowRoot
  private config: ProxyComponentConfig
  private contentContainer: HTMLDivElement
  private loadingIndicator: HTMLDivElement
  private errorContainer: HTMLDivElement
  private iframe: HTMLIFrameElement | null = null
  
  // Observed attributes for reactive updates
  static get observedAttributes(): string[] {
    return ['src', 'session-id', 'mode', 'csp-level', 'fallback-enabled']
  }

  constructor() {
    super()
    
    // Create shadow root with open mode for React integration
    this.shadow = this.attachShadow({ mode: 'open' })
    
    // Initialize configuration
    this.config = {
      src: '',
      mode: 'ssr',
      cspLevel: 'balanced',
      fallbackEnabled: true
    }
    
    this.contentContainer = document.createElement('div')
    this.loadingIndicator = document.createElement('div')
    this.errorContainer = document.createElement('div')
    
    this.setupShadowDOM()
    this.setupEventListeners()
  }

  private setupShadowDOM(): void {
    // Create style encapsulation
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        border-radius: var(--proxy-border-radius, 8px);
        box-shadow: var(--proxy-shadow, 0 2px 8px rgba(0,0,0,0.1));
      }
      
      .proxy-container {
        width: 100%;
        height: 100%;
        position: relative;
        background: var(--proxy-bg-color, #ffffff);
      }
      
      .loading-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        z-index: 100;
      }
      
      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--proxy-accent-color, #3b82f6);
        border-top: 3px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .content-container {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
      }
      
      .error-container {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
        background: var(--proxy-error-bg, #fef2f2);
        color: var(--proxy-error-text, #991b1b);
      }
      
      .ssr-content {
        width: 100%;
        height: 100%;
        border: none;
        overflow: auto;
      }
      
      .mode-toggle {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 200;
        background: var(--proxy-control-bg, rgba(255,255,255,0.9));
        border: 1px solid var(--proxy-control-border, #e5e7eb);
        border-radius: 6px;
        padding: 4px;
        display: flex;
        gap: 2px;
      }
      
      .mode-button {
        padding: 6px 12px;
        font-size: 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
        color: var(--proxy-control-text, #6b7280);
      }
      
      .mode-button.active {
        background: var(--proxy-accent-color, #3b82f6);
        color: white;
      }
      
      .mode-button:hover:not(.active) {
        background: var(--proxy-control-hover, #f3f4f6);
      }

      .loading-text {
        font-size: 14px;
        color: var(--proxy-text-color, #374151);
        margin-top: 8px;
      }

      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .error-message {
        font-size: 14px;
        margin-bottom: 16px;
        opacity: 0.8;
      }

      .retry-button {
        padding: 8px 16px;
        font-size: 14px;
        border: 1px solid currentColor;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .retry-button:hover {
        background: currentColor;
        color: white;
      }
    `
    
    // Create DOM structure
    this.contentContainer.className = 'proxy-container'
    
    this.loadingIndicator.className = 'loading-indicator'
    this.loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading content...</div>
    `
    
    this.errorContainer.className = 'error-container'
    this.errorContainer.style.display = 'none'
    
    // Mode toggle controls
    const modeToggle = document.createElement('div')
    modeToggle.className = 'mode-toggle'
    modeToggle.innerHTML = `
      <button class="mode-button" data-mode="ssr">SSR</button>
      <button class="mode-button" data-mode="iframe">Iframe</button>
    `
    
    this.shadow.append(style, this.contentContainer, this.loadingIndicator, this.errorContainer, modeToggle)
  }

  private setupEventListeners(): void {
    // Mode toggle event listeners
    this.shadow.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('mode-button')) {
        const newMode = target.dataset.mode as 'ssr' | 'iframe'
        this.switchMode(newMode)
      }
      if (target.classList.contains('retry-button')) {
        this.loadContent()
      }
    })
    
    // Custom navigation events
    this.addEventListener('navigate', ((event: CustomEvent) => {
      this.navigateTo(event.detail.url)
    }) as EventListener)
  }

  // Lifecycle callbacks
  connectedCallback(): void {
    this.updateConfigFromAttributes()
    if (this.config.src) {
      this.loadContent()
    }
  }

  disconnectedCallback(): void {
    this.cleanup()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue !== newValue) {
      this.updateConfigFromAttributes()
      if (name === 'src' && newValue) {
        this.loadContent()
      }
    }
  }

  private updateConfigFromAttributes(): void {
    this.config = {
      src: this.getAttribute('src') || '',
      sessionId: this.getAttribute('session-id') || undefined,
      mode: (this.getAttribute('mode') as 'ssr' | 'iframe') || 'ssr',
      cspLevel: (this.getAttribute('csp-level') as 'permissive' | 'balanced' | 'strict') || 'balanced',
      fallbackEnabled: this.getAttribute('fallback-enabled') !== 'false'
    }
    
    this.updateModeToggle()
  }

  private updateModeToggle(): void {
    const buttons = this.shadow.querySelectorAll('.mode-button')
    buttons.forEach(button => {
      const btn = button as HTMLElement
      btn.classList.toggle('active', btn.dataset.mode === this.config.mode)
    })
  }

  private async loadContent(): Promise<void> {
    if (!this.config.src) return
    
    this.showLoading()
    this.hideError()
    
    try {
      if (this.config.mode === 'ssr') {
        await this.loadSSRContent()
      } else {
        await this.loadIframeContent()
      }
    } catch (error) {
      console.error('Failed to load content:', error)
      if (this.config.fallbackEnabled && this.config.mode === 'ssr') {
        console.log('Falling back to iframe mode')
        this.config.mode = 'iframe'
        this.updateModeToggle()
        await this.loadIframeContent()
      } else {
        this.showError(error as Error)
      }
    }
  }

  private async loadSSRContent(): Promise<void> {
    const proxyUrl = this.buildProxyUrl({ ssr: true })
    
    const response = await fetch(proxyUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const content = await response.text()
    
    // Create content container for SSR
    const ssrContainer = document.createElement('div')
    ssrContainer.className = 'ssr-content'
    ssrContainer.innerHTML = content
    
    // Handle navigation within SSR content
    this.setupSSRNavigation(ssrContainer)
    
    this.contentContainer.innerHTML = ''
    this.contentContainer.appendChild(ssrContainer)
    this.hideLoading()
    
    // Dispatch load event
    this.dispatchEvent(new CustomEvent('proxy-load', {
      detail: { mode: 'ssr', url: this.config.src }
    }))
  }

  private async loadIframeContent(): Promise<void> {
    const proxyUrl = this.buildProxyUrl({ ssr: false })
    
    if (this.iframe) {
      this.iframe.remove()
    }
    
    this.iframe = document.createElement('iframe')
    this.iframe.className = 'content-container'
    this.iframe.src = proxyUrl
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation')
    
    this.iframe.onload = () => {
      this.hideLoading()
      this.dispatchEvent(new CustomEvent('proxy-load', {
        detail: { mode: 'iframe', url: this.config.src }
      }))
    }
    
    this.iframe.onerror = () => {
      this.showError(new Error('Failed to load iframe content'))
    }
    
    this.contentContainer.innerHTML = ''
    this.contentContainer.appendChild(this.iframe)
  }

  private setupSSRNavigation(container: HTMLElement): void {
    container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href) {
        event.preventDefault()
        
        // Extract original URL from proxied link
        const linkUrl = new URL(link.href)
        let navigationUrl = link.href
        
        // Check if it's a proxied URL and extract the original
        if (linkUrl.pathname.includes('/proxy-service/')) {
          const pathParts = linkUrl.pathname.split('/')
          const proxyIndex = pathParts.findIndex(part => part === 'proxy-service')
          if (proxyIndex !== -1 && pathParts.length > proxyIndex + 2) {
            navigationUrl = decodeURIComponent(pathParts.slice(proxyIndex + 2).join('/'))
          }
        }
        
        this.navigateTo(navigationUrl)
      }
    })
  }

  private buildProxyUrl(options: { ssr: boolean }): string {
    const baseUrl = this.getAttribute('proxy-base-url') || '/functions/v1/proxy-service'
    const encodedUrl = encodeURIComponent(this.config.src)
    
    let url: string
    if (this.config.sessionId) {
      url = `${baseUrl}/${this.config.sessionId}/${encodedUrl}`
    } else {
      url = `${baseUrl}?url=${encodedUrl}`
    }
    
    const params = new URLSearchParams()
    if (options.ssr) {
      params.set('ssr', 'true')
      params.set('csp', this.config.cspLevel)
    }
    
    return params.toString() ? `${url}${url.includes('?') ? '&' : '?'}${params}` : url
  }

  // Public API methods
  navigateTo(url: string): void {
    this.config.src = url
    this.setAttribute('src', url)
    this.loadContent()
    
    // Dispatch navigation event for parent components
    this.dispatchEvent(new CustomEvent('proxy-navigate', {
      detail: { url },
      bubbles: true
    }))
  }

  switchMode(mode: 'ssr' | 'iframe'): void {
    if (mode !== this.config.mode) {
      this.config.mode = mode
      this.setAttribute('mode', mode)
      this.updateModeToggle()
      this.loadContent()
    }
  }

  refresh(): void {
    this.loadContent()
  }

  private showLoading(): void {
    this.loadingIndicator.style.display = 'flex'
  }

  private hideLoading(): void {
    this.loadingIndicator.style.display = 'none'
  }

  private showError(error: Error): void {
    this.errorContainer.style.display = 'flex'
    this.errorContainer.innerHTML = `
      <div class="error-icon">⚠️</div>
      <div class="error-title">Failed to Load Content</div>
      <div class="error-message">${error.message}</div>
      <button class="retry-button">Retry</button>
    `
    this.hideLoading()
  }

  private hideError(): void {
    this.errorContainer.style.display = 'none'
  }

  private cleanup(): void {
    if (this.iframe) {
      this.iframe.remove()
      this.iframe = null
    }
  }
}

// Register the custom element
customElements.define('proxy-viewer', ProxyViewerElement) 