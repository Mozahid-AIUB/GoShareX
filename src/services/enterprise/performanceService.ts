/**
 * performanceService.ts — Monitor app performance
 * 
 * Tracks:
 * - Screen load times
 * - API response times
 * - Memory usage
 * - Frame rate drops
 */

import { analyticsService, PerformanceMetric } from './analyticsService';

interface ScreenLoadMetric {
    screen: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    components?: Record<string, number>; // Component load times
}

class PerformanceService {
    private static instance: PerformanceService;
    private screenMetrics: Map<string, ScreenLoadMetric> = new Map();
    private apiMetrics: Array<{ path: string; duration: number; timestamp: number }> = [];
    private maxMetrics = 100;

    private constructor() { }

    static getInstance(): PerformanceService {
        if (!PerformanceService.instance) {
            PerformanceService.instance = new PerformanceService();
        }
        return PerformanceService.instance;
    }

    /**
     * Start measuring screen load time
     */
    startScreenMeasure(screen: string): void {
        this.screenMetrics.set(screen, {
            screen,
            startTime: Date.now(),
        });
    }

    /**
     * End screen measurement and log
     */
    endScreenMeasure(screen: string): number | null {
        const metric = this.screenMetrics.get(screen);
        if (!metric) return null;

        const endTime = Date.now();
        const duration = endTime - metric.startTime;

        metric.endTime = endTime;
        metric.duration = duration;

        // Track via analytics
        analyticsService.trackPerformance({
            screen,
            loadTime: duration,
            renderTime: 0,
            jsThreadTime: 0,
            memoryUsed: 0,
        });

        // Warn if slow
        if (duration > 2000) {
            console.warn(`[Performance] Slow screen: ${screen} took ${duration}ms`);
        }

        return duration;
    }

    /**
     * Measure component render time (nested)
     */
    measureComponent(screen: string, component: string, duration: number): void {
        const metric = this.screenMetrics.get(screen);
        if (!metric) return;

        if (!metric.components) metric.components = {};
        metric.components[component] = duration;

        if (duration > 500) {
            console.warn(`[Performance] Slow component: ${component} in ${screen} took ${duration}ms`);
        }
    }

    /**
     * Measure API call duration
     */
    measureAPI(path: string, duration: number): void {
        this.apiMetrics.push({ path, duration, timestamp: Date.now() });

        // Keep only recent metrics
        if (this.apiMetrics.length > this.maxMetrics) {
            this.apiMetrics.shift();
        }

        // Warn if slow
        if (duration > 3000) {
            console.warn(`[Performance] Slow API: ${path} took ${duration}ms`);
        }

        // Track via analytics
        analyticsService.trackTechnical('api_call_slow', {
            path,
            duration,
        });
    }

    /**
     * Get average API response time
     */
    getAverageAPITime(): number {
        if (this.apiMetrics.length === 0) return 0;
        const total = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
        return total / this.apiMetrics.length;
    }

    /**
     * Get slowest screens
     */
    getSlowestScreens(limit = 5): ScreenLoadMetric[] {
        return Array.from(this.screenMetrics.values())
            .filter((m) => m.duration)
            .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
            .slice(0, limit);
    }

    /**
     * Get memory pressure (basic check)
     */
    getMemoryPressure(): 'low' | 'medium' | 'high' {
        // This is a simplified check; actual implementation depends on platform
        // In production, use react-native-device-info or similar
        return 'low';
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.screenMetrics.clear();
        this.apiMetrics = [];
    }
}

export const performanceService = PerformanceService.getInstance();

/**
 * Decorator to measure screen load time
 */
export function MeasureScreen(screen: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            performanceService.startScreenMeasure(screen);
            const result = originalMethod.apply(this, args);
            // Note: We can't reliably measure end time here; should call endScreenMeasure in useEffect
            return result;
        };

        return descriptor;
    };
}

/**
 * Hook-like helper for React screens
 */
export function useScreenPerformance(screen: string): () => void {
    // Call this in useEffect
    return () => {
        performanceService.startScreenMeasure(screen);
        return () => {
            performanceService.endScreenMeasure(screen);
        };
    };
}

/**
 * Measure async operation
 */
export async function measureAsync<T>(
    label: string,
    fn: () => Promise<T>,
    onSlow?: (duration: number) => void
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`[Performance] Slow operation: ${label} took ${duration}ms`);
            onSlow?.(duration);
        }
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Performance] Operation failed: ${label} after ${duration}ms`, error);
        throw error;
    }
}
