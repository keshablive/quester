export class PerformanceTelemetry {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number> = new Map();

  /**
   * Start a timer for a named operation
   * @param name - The name of the operation to time
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * Stop a timer and record the duration
   * @param name - The name of the operation to stop timing
   * @returns The duration in milliseconds, or 0 if the timer was not started
   */
  stopTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    this.metrics.set(name, duration);

    return duration;
  }

  /**
   * Get all recorded metrics
   * @returns An object containing all recorded operation durations
   */
  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get a specific metric by name
   * @param name - The name of the operation
   * @returns The duration in milliseconds, or undefined if not found
   */
  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }
}

// Singleton instance for global use
export const telemetry = new PerformanceTelemetry();
