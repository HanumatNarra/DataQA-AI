/**
 * Analytics tracking utility
 * No-ops if ANALYTICS_ENABLED env var is not set
 */
export function track(name: string, payload?: Record<string, any>): void {
  // Only track if analytics is explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ANALYTICS_ENABLED === 'true') {
    try {
      // In production, you could send to your analytics service
      // For now, just log to console
      console.log(`[ANALYTICS] ${name}`, payload)
    } catch (error) {
      // Silently fail in production
      console.warn(`[ANALYTICS] Failed to track ${name}:`, error)
    }
  }
}
