import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'sm_perf_metrics_v1';
const MAX_METRICS = 120;

function saveMetric(metric) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const next = [...existing, metric].slice(-MAX_METRICS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors to avoid impacting app flow
  }
}

function trackInitialNavigationMetrics() {
  const navEntries = performance.getEntriesByType('navigation');
  if (!navEntries.length) return;

  const nav = navEntries[0];
  saveMetric({
    type: 'initial-navigation',
    path: window.location.pathname,
    ttfb: Number(nav.responseStart.toFixed(2)),
    domContentLoaded: Number(nav.domContentLoadedEventEnd.toFixed(2)),
    loadEvent: Number(nav.loadEventEnd.toFixed(2)),
    timestamp: new Date().toISOString(),
  });
}

function trackWebVitalsSnapshot() {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) return;
      saveMetric({
        type: 'lcp',
        path: window.location.pathname,
        value: Number(lastEntry.startTime.toFixed(2)),
        timestamp: new Date().toISOString(),
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      if (clsValue > 0) {
        saveMetric({
          type: 'cls',
          path: window.location.pathname,
          value: Number(clsValue.toFixed(5)),
          timestamp: new Date().toISOString(),
        });
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lcpObserver.disconnect();
        clsObserver.disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  } catch {
    return undefined;
  }
}

export default function PerformanceMonitor() {
  const location = useLocation();
  const firstRunRef = useRef(true);

  useEffect(() => {
    const vitalsCleanup = trackWebVitalsSnapshot();
    trackInitialNavigationMetrics();

    if (typeof window !== 'undefined') {
      window.getStudentMarketplaceMetrics = () => {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
          return [];
        }
      };
    }

    return () => {
      if (typeof vitalsCleanup === 'function') {
        vitalsCleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    const start = performance.now();
    let rafId1 = 0;
    let rafId2 = 0;

    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        const duration = performance.now() - start;
        saveMetric({
          type: 'route-transition',
          path: location.pathname,
          duration: Number(duration.toFixed(2)),
          timestamp: new Date().toISOString(),
        });
      });
    });

    return () => {
      if (rafId1) window.cancelAnimationFrame(rafId1);
      if (rafId2) window.cancelAnimationFrame(rafId2);
    };
  }, [location.pathname]);

  return null;
}
