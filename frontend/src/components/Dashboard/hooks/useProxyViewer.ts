import { useState, useEffect, useRef, useCallback } from 'react'
import { PreloadMetrics, ResourceOptimizations } from '../types'

export function useProxyViewer(targetDomain: string) {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [urlHistory, setUrlHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [preloadMetrics, setPreloadMetrics] = useState<PreloadMetrics>({
    warningsCount: 0,
    optimizedResources: 0
  })
  const [crossOriginErrors, setCrossOriginErrors] = useState<string[]>([])
  const [resourceOptimizations, setResourceOptimizations] = useState<ResourceOptimizations>({
    crossOriginBlocked: 0,
    preloadsOptimized: 0,
    scriptsDisabled: 0
  })

  const urlInputRef = useRef<HTMLInputElement>(null)
  const viewerRef = useRef<any>(null)

  // Initialize URL on mount
  useEffect(() => {
    const url = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`
    setCurrentUrl(url)
    setUrlHistory([url])
    setHistoryIndex(0)
  }, [targetDomain])

  // Enhanced console monitoring for cross-origin issues
  useEffect(() => {
    const originalError = console.error
    const originalWarn = console.warn
    
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('Unsafe attempt to load') || 
          message.includes('blocked by CORS') ||
          message.includes('cross-origin')) {
        setCrossOriginErrors(prev => [...prev.slice(-4), message]) // Keep last 5 errors
        setResourceOptimizations(prev => ({
          ...prev,
          crossOriginBlocked: prev.crossOriginBlocked + 1
        }))
      }
      originalError.apply(console, args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      if (message.includes('preloaded using link preload')) {
        setPreloadMetrics(prev => ({ ...prev, warningsCount: prev.warningsCount + 1 }))
      }
      originalWarn.apply(console, args)
    }

    return () => {
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  // Navigation functions
  const navigateTo = useCallback((url: string) => {
    setIsLoading(true)
    setError('')
    
    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    const newHistory = [...urlHistory.slice(0, historyIndex + 1), targetUrl]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    setCurrentUrl(targetUrl)
  }, [urlHistory, historyIndex])

  const handleGoBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
    }
  }, [historyIndex, urlHistory])

  const handleGoForward = useCallback(() => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
    }
  }, [historyIndex, urlHistory])

  const handleGoHome = useCallback(() => {
    navigateTo(targetDomain)
  }, [navigateTo, targetDomain])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    setError('')
    
    if (viewerRef.current?.refresh) {
      viewerRef.current.refresh()
    } else {
      setCurrentUrl(currentUrl + (currentUrl.includes('?') ? '&' : '?') + 't=' + Date.now())
    }
  }, [currentUrl])

  const handleNavigate = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (urlInputRef.current && urlInputRef.current.value) {
      navigateTo(urlInputRef.current.value)
    }
  }, [navigateTo])

  const handleOpenOriginal = useCallback(() => {
    window.open(currentUrl, '_blank')
  }, [currentUrl])

  const handleProxyLoad = useCallback((event: { mode: string; url: string }) => {
    setIsLoading(false)
    console.log('Proxy loaded:', event)
  }, [])

  const handleProxyError = useCallback((error: Error) => {
    setIsLoading(false)
    setError(error.message)
  }, [])

  const handleProxyNavigate = useCallback((url: string) => {
    const newHistory = [...urlHistory.slice(0, historyIndex + 1), url]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setCurrentUrl(url)
    
    if (urlInputRef.current) {
      urlInputRef.current.value = url
    }
  }, [urlHistory, historyIndex])

  return {
    // State
    currentUrl,
    isLoading,
    error,
    urlHistory,
    historyIndex,
    preloadMetrics,
    crossOriginErrors,
    resourceOptimizations,
    
    // Refs
    urlInputRef,
    viewerRef,
    
    // Computed
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < urlHistory.length - 1,
    
    // Actions
    setIsLoading,
    setError,
    setPreloadMetrics,
    setResourceOptimizations,
    navigateTo,
    handleGoBack,
    handleGoForward,
    handleGoHome,
    handleRefresh,
    handleNavigate,
    handleOpenOriginal,
    handleProxyLoad,
    handleProxyError,
    handleProxyNavigate
  }
} 