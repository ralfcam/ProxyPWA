declare namespace JSX {
  interface IntrinsicElements {
    'proxy-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string
      'session-id'?: string
      mode?: string
      'csp-level'?: string
      'fallback-enabled'?: string
      'proxy-base-url'?: string
    }, HTMLElement>
  }
}

interface ProxyViewerElement extends HTMLElement {
  navigateTo(url: string): void
  switchMode(mode: 'ssr' | 'iframe'): void
  refresh(): void
} 