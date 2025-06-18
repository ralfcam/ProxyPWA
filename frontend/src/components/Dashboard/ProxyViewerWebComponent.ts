import { ProxyComponentConfig } from './types'

export class ProxyViewerElement extends HTMLElement {
  private shadow: ShadowRoot
  private config: ProxyComponentConfig
  private contentContainer: HTMLDivElement
  private loadingIndicator: HTMLDivElement
  private errorContainer: HTMLDivElement
  private iframe: HTMLIFrameElement | null = null
  
  // Observed attributes for reactive updates
  static get observedAttributes(): string[] {
    return ['src', 'session-id', 'mode', 'csp-level', 'fallback-enabled', 'render-quality', 'bypass-bot', 'use-proxy', 'proxy-country']
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
        position: relative;
        background: white;
      }
      
      /* SSR Content Isolation */
      .ssr-wrapper {
        width: 100%;
        min-height: 100%;
        position: relative;
        overflow: hidden;
        /* Create a new stacking context */
        isolation: isolate;
      }
      
      .ssr-body {
        position: relative;
        width: 100%;
        /* Contain floats and margins */
        overflow: hidden;
      }
      
      /* Reset styles for SSR content to prevent inheritance */
      .ssr-body * {
        /* Ensure content stays within bounds */
        max-width: 100% !important;
        position: relative !important;
      }
      
      /* Prevent fixed positioning from breaking out */
      .ssr-body *[style*="position: fixed"],
      .ssr-body *[style*="position:fixed"] {
        position: absolute !important;
      }
      
      /* Scope link styles to SSR content */
      .ssr-content a {
        cursor: pointer;
        text-decoration: underline;
      }
      
      .ssr-content a:hover {
        opacity: 0.8;
      }
      
      /* Ensure forms in SSR content are interactive */
      .ssr-content form {
        pointer-events: auto;
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
    
    // Extract BrowserQL metadata from response headers
    const browserqlMetadata: any = {}
    if (response.headers.get('X-Renderer') === 'browserql-graphql') {
      browserqlMetadata.renderer = 'browserql-graphql'
      browserqlMetadata.renderTime = parseInt(response.headers.get('X-Render-Time') || '0')
      browserqlMetadata.region = response.headers.get('X-Region') || 'unknown'
      browserqlMetadata.botDetectionBypassed = response.headers.get('X-Bot-Detection-Bypassed') === 'true'
      browserqlMetadata.captchaSolved = response.headers.get('X-Captcha-Solved') === 'true'
      browserqlMetadata.cloudflareFound = response.headers.get('X-Cloudflare-Found') === 'true'
      
      // Dispatch BrowserQL metadata event
      this.dispatchEvent(new CustomEvent('browserql-metadata', {
        detail: browserqlMetadata,
        bubbles: true
      }))
    }
    
    // Parse the HTML content to extract body and styles
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    
    // Extract styles from head to preserve styling
    const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]'))
    const styleContent = styles.map(el => el.outerHTML).join('\n')
    
    // Extract body content
    const bodyContent = doc.body ? doc.body.innerHTML : content
    
    // Create a container that preserves styles but contains the content
    const processedContent = `
      <div class="ssr-wrapper" data-origin="${this.config.src}">
        ${styleContent}
        <div class="ssr-body">
          ${bodyContent}
        </div>
      </div>
    `
    
    // Process content to optimize resource hints
    const optimizedContent = this.processResourceHints(processedContent)
    
    // Create content container for SSR
    const ssrContainer = document.createElement('div')
    ssrContainer.className = 'ssr-content'
    ssrContainer.innerHTML = optimizedContent
    
    // Handle navigation within SSR content
    this.setupSSRNavigation(ssrContainer)
    
    // Set up lazy loading for videos
    this.setupVideoLazyLoading(ssrContainer)
    
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
        event.stopPropagation()
        
        try {
          // Get the href attribute to handle relative URLs
          const hrefAttr = link.getAttribute('href')
          if (!hrefAttr) return
          
          let navigationUrl: string
          
          // Handle different URL types
          if (hrefAttr.startsWith('http://') || hrefAttr.startsWith('https://')) {
            // Absolute URL
            navigationUrl = hrefAttr
          } else if (hrefAttr.startsWith('//')) {
            // Protocol-relative URL
            const protocol = new URL(this.config.src).protocol
            navigationUrl = protocol + hrefAttr
          } else if (hrefAttr.startsWith('/')) {
            // Absolute path
            const origin = new URL(this.config.src).origin
            navigationUrl = origin + hrefAttr
          } else if (hrefAttr.startsWith('#')) {
            // Hash navigation - don't navigate
            return
          } else {
            // Relative path - resolve against current target URL
            navigationUrl = new URL(hrefAttr, this.config.src).href
          }
          
          console.log('SSR Navigation:', {
            original: hrefAttr,
            resolved: navigationUrl,
            currentUrl: this.config.src
          })
          
          // Navigate through proxy
          this.navigateTo(navigationUrl)
          
        } catch (error) {
          console.error('Navigation error:', error)
        }
      }
    })

    // Also intercept form submissions
    container.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      if (form && form.action) {
        event.preventDefault()
        
        try {
          // Resolve form action URL
          const actionAttr = form.getAttribute('action') || ''
          let actionUrl: string
          
          if (actionAttr.startsWith('http://') || actionAttr.startsWith('https://')) {
            actionUrl = actionAttr
          } else if (actionAttr.startsWith('/')) {
            const origin = new URL(this.config.src).origin
            actionUrl = origin + actionAttr
          } else {
            actionUrl = new URL(actionAttr, this.config.src).href
          }
          
          // Handle GET forms by constructing URL with query params
          if (form.method.toLowerCase() === 'get') {
            const formData = new FormData(form)
            const params = new URLSearchParams(formData as any)
            const separator = actionUrl.includes('?') ? '&' : '?'
            this.navigateTo(actionUrl + separator + params.toString())
          } else {
            // For POST forms, just navigate to the action URL
            // (Full POST support would require more complex handling)
            this.navigateTo(actionUrl)
          }
        } catch (error) {
          console.error('Form submission error:', error)
        }
      }
    })

    // Listen for cross-origin error messages from monitored content
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'cross-origin-error') {
        this.dispatchEvent(new CustomEvent('resource-optimized', {
          detail: { 
            type: 'crossOriginBlocked', 
            count: 1,
            message: event.data.message 
          }
        }))
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
      
      // Add BrowserQL parameters
      const renderQuality = this.getAttribute('render-quality')
      const bypassBot = this.getAttribute('bypass-bot')
      const useProxy = this.getAttribute('use-proxy')
      const proxyCountry = this.getAttribute('proxy-country')
      
      if (renderQuality) {
        params.set('quality', renderQuality)
      }
      if (bypassBot) {
        params.set('bypass', bypassBot)
      }
      if (useProxy) {
        params.set('proxy', useProxy)
      }
      if (proxyCountry) {
        params.set('country', proxyCountry)
      }
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

  private processResourceHints(content: string): string {
    const tempDoc = new DOMParser().parseFromString(content, 'text/html')
    
    // Enhanced resource processing
    this.optimizePreloads(tempDoc)
    this.sanitizeCrossOriginResources(tempDoc)
    this.addResourceMonitoring(tempDoc)
    
    return tempDoc.documentElement.outerHTML
  }

  private sanitizeCrossOriginResources(doc: Document): void {
    const currentOrigin = window.location.origin
    let blockedCount = 0

    // Monitor and block problematic cross-origin scripts
    const scripts = doc.querySelectorAll('script[src]')
    scripts.forEach(script => {
      const src = script.getAttribute('src')
      if (src) {
        try {
          const url = new URL(src, this.config.src)
          if (url.origin !== new URL(this.config.src).origin && 
              url.origin !== currentOrigin) {
            script.setAttribute('data-blocked', 'cross-origin')
            script.removeAttribute('src')
            blockedCount++
          }
        } catch (error) {
          script.remove()
          blockedCount++
        }
      }
    })

    // Dispatch optimization event
    if (blockedCount > 0) {
      this.dispatchEvent(new CustomEvent('resource-optimized', {
        detail: { type: 'crossOriginBlocked', count: blockedCount }
      }))
    }
  }

  private optimizePreloads(doc: Document): void {
    let optimizedCount = 0
    
    // Enhanced preload optimization
    const preloads = doc.querySelectorAll('link[rel="preload"]')
    preloads.forEach(link => {
      const href = link.getAttribute('href')
      const asAttr = link.getAttribute('as')
      
      if (href && (asAttr === 'video' || href.includes('.m3u8'))) {
        link.setAttribute('rel', 'prefetch')
        link.removeAttribute('as')
        optimizedCount++
      }
    })

    // Remove problematic video preloads
    const problematicPreloads = doc.querySelectorAll(
      'link[rel="preload"][href*=".ts"], ' +
      'link[rel="preload"][href*="hls"]'
    )
    problematicPreloads.forEach(link => {
      link.remove()
      optimizedCount++
    })

    if (optimizedCount > 0) {
      this.dispatchEvent(new CustomEvent('resource-optimized', {
        detail: { type: 'preloadsOptimized', count: optimizedCount }
      }))
    }
  }

  private addResourceMonitoring(doc: Document): void {
    // Add monitoring script for runtime cross-origin detection
    const monitoringScript = doc.createElement('script')
    monitoringScript.textContent = `
      (function() {
        const originalError = window.onerror;
        window.onerror = function(msg, url, line, col, error) {
          if (typeof msg === 'string' && 
              (msg.includes('cross-origin') || 
               msg.includes('CORS') || 
               msg.includes('blocked'))) {
            // Notify parent component of cross-origin issues
            if (window.parent !== window) {
              try {
                window.parent.postMessage({
                  type: 'cross-origin-error',
                  message: msg,
                  url: url
                }, '*');
              } catch (e) {
                // Ignore postMessage errors
              }
            }
          }
          if (originalError) {
            return originalError.apply(this, arguments);
          }
        };
      })();
    `
    
    const head = doc.querySelector('head')
    if (head) {
      head.appendChild(monitoringScript)
    }
  }
  
  private optimizeVideoPreloads(doc: Document): void {
    // Convert video preloads to prefetch
    const videoPreloads = doc.querySelectorAll('link[rel="preload"][as="video"]')
    videoPreloads.forEach(link => {
      link.setAttribute('rel', 'prefetch')
      link.removeAttribute('as')
    })
    
    // Remove HLS segment preloads
    const hlsPreloads = doc.querySelectorAll('link[rel="preload"][href*=".m3u8"], link[rel="preload"][href*=".ts"]')
    hlsPreloads.forEach(link => link.remove())
    
    // Optimize video elements
    const videoElements = doc.querySelectorAll('video')
    videoElements.forEach(video => {
      const src = video.getAttribute('src')
      if (src && (src.includes('.m3u8') || src.includes('hls'))) {
        video.setAttribute('preload', 'metadata')
        video.setAttribute('data-lazy-video', 'true')
      }
    })
  }

  private setupVideoLazyLoading(container: HTMLElement): void {
    // Find all videos marked for lazy loading
    const lazyVideos = container.querySelectorAll('video[data-lazy-video]')
    
    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const video = entry.target as HTMLVideoElement
            
            // Add error handling for video loading
            this.setupVideoErrorHandling(video)
            
            // Upgrade preload attribute when video is visible
            if (video.getAttribute('preload') === 'metadata') {
              video.setAttribute('preload', 'auto')
            }
            
            // If video has a data-src attribute, move it to src
            const dataSrc = video.getAttribute('data-src')
            if (dataSrc) {
              video.setAttribute('src', dataSrc)
              video.removeAttribute('data-src')
            }
            
            // Stop observing this video
            videoObserver.unobserve(video)
            
            // Dispatch custom event for tracking
            this.dispatchEvent(new CustomEvent('video-optimized', {
              detail: { url: video.src || dataSrc },
              bubbles: true
            }))
          }
        })
      }, {
        rootMargin: '50px' // Start loading 50px before video enters viewport
      })
      
      lazyVideos.forEach(video => videoObserver.observe(video))
    } else {
      // Fallback for browsers without IntersectionObserver
      lazyVideos.forEach(video => {
        this.setupVideoErrorHandling(video as HTMLVideoElement)
        video.setAttribute('preload', 'auto')
        const dataSrc = video.getAttribute('data-src')
        if (dataSrc) {
          video.setAttribute('src', dataSrc)
          video.removeAttribute('data-src')
        }
      })
    }
  }

  private setupVideoErrorHandling(video: HTMLVideoElement): void {
    video.addEventListener('error', (event) => {
      console.warn('Video loading error:', video.src)
      
      // Try to recover by removing problematic attributes
      if (video.getAttribute('preload') === 'auto') {
        video.setAttribute('preload', 'metadata')
      }
      
      // Dispatch error event for tracking
      this.dispatchEvent(new CustomEvent('video-error', {
        detail: { 
          url: video.src,
          error: 'Failed to load video'
        },
        bubbles: true
      }))
      
      // Add visual indicator
      const errorOverlay = document.createElement('div')
      errorOverlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10;
      `
      errorOverlay.textContent = 'Video unavailable'
      
      if (video.parentElement) {
        video.parentElement.style.position = 'relative'
        video.parentElement.appendChild(errorOverlay)
      }
    })
    
    // Handle stalled video loading
    video.addEventListener('stalled', () => {
      console.warn('Video loading stalled:', video.src)
      // Reduce preload level to prevent hanging
      if (video.getAttribute('preload') === 'auto') {
        video.setAttribute('preload', 'metadata')
      }
    })
  }
}

// Register the custom element
customElements.define('proxy-viewer', ProxyViewerElement) 