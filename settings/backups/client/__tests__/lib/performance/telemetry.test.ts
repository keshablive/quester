import { PerformanceTelemetry } from '@/lib/performance/telemetry';

describe('PerformanceTelemetry', () => {
  let telemetry: PerformanceTelemetry;

  beforeEach(() => {
    telemetry = new PerformanceTelemetry();
  });

  it('starts and stops a timer successfully', () => {
    telemetry.startTimer('test-operation');
    
    // Wait a bit
    const start = Date.now();
    while (Date.now() - start < 10) {
      // busy wait
    }

    const duration = telemetry.stopTimer('test-operation');
    
    expect(duration).toBeGreaterThanOrEqual(10);
  });

  it('returns 0 for stopping a non-existent timer', () => {
    const duration = telemetry.stopTimer('non-existent');
    expect(duration).toBe(0);
  });

  it('records multiple timers independently', () => {
    telemetry.startTimer('op1');
    telemetry.startTimer('op2');

    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait
    }

    const duration1 = telemetry.stopTimer('op1');
    
    const start2 = Date.now();
    while (Date.now() - start2 < 5) {
      // busy wait
    }

    const duration2 = telemetry.stopTimer('op2');

    expect(duration1).toBeGreaterThanOrEqual(5);
    expect(duration2).toBeGreaterThanOrEqual(10);
  });

  it('retrieves metrics for completed operations', () => {
    telemetry.startTimer('measured-op');
    telemetry.stopTimer('measured-op');

    const metrics = telemetry.getMetrics();
    expect(metrics['measured-op']).toBeDefined();
    expect(metrics['measured-op']).toBeGreaterThanOrEqual(0);
  });

  it('clears all metrics', () => {
    telemetry.startTimer('op-to-clear');
    telemetry.stopTimer('op-to-clear');

    telemetry.clearMetrics();

    const metrics = telemetry.getMetrics();
    expect(Object.keys(metrics).length).toBe(0);
  });
});
