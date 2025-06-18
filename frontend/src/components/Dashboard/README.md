# Dashboard Components

This directory contains all components related to the dashboard functionality of the VPN proxy application.

## Directory Structure

```
Dashboard/
├── components/           # Shared UI components
│   ├── ExternalProxyMode.tsx    # External proxy mode UI
│   └── ProxyNavigationBar.tsx   # Proxy navigation controls
├── hooks/               # Custom React hooks
│   └── useProxyViewer.ts        # Proxy viewer logic hook
├── Account.tsx          # Account management component
├── Dashboard.tsx        # Main dashboard component
├── DashboardLayout.tsx  # Dashboard layout wrapper
├── ProxyControl.tsx     # Proxy session control panel
├── ProxyViewer.tsx      # Main proxy viewer (SSR-enabled)
├── ProxyViewerWebComponent.ts   # Web Component for SSR proxy
├── ProxyViewerWrapper.tsx       # React wrapper for Web Component
├── Settings.tsx         # User settings component
├── Statistics.tsx       # Usage statistics component
├── types.ts            # TypeScript type definitions
└── index.ts            # Barrel exports
```

## Component Overview

### Core Components

- **ProxyViewer**: The main proxy viewing component with SSR support and cross-origin security
- **ProxyControl**: Controls for starting/stopping proxy sessions
- **ProxyViewerWebComponent**: Custom Web Component that handles SSR rendering
- **ProxyViewerWrapper**: React wrapper that bridges the Web Component with React

### Shared Components

- **ExternalProxyMode**: UI for external proxy service selection
- **ProxyNavigationBar**: Reusable navigation bar for proxy viewing

### Hooks

- **useProxyViewer**: Centralizes proxy viewer logic including navigation, error handling, and metrics

## Key Features

1. **SSR Support**: Server-side rendering to bypass CSP restrictions
2. **Cross-Origin Security**: Automatic detection and handling of cross-origin resources
3. **Resource Optimization**: Intelligent preload management for video content
4. **Metrics Tracking**: Real-time monitoring of security and performance metrics

## Usage

```tsx
import { ProxyViewer, ProxyControl } from '@/components/Dashboard'

// Use the proxy viewer
<ProxyViewer
  targetDomain="example.com"
  sessionId="session-123"
  mode="direct"
  onClose={() => {}}
/>

// Use the proxy control
<ProxyControl />
```

## Type Safety

All components use shared TypeScript types defined in `types.ts`:

- `ProxySession`: Proxy session data structure
- `ProxyViewerProps`: Props for the proxy viewer
- `ProxyComponentConfig`: Configuration for the Web Component
- `ResourceOptimizations`: Metrics for resource optimization
- `PreloadMetrics`: Metrics for preload optimization 