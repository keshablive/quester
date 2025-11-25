// Feature 003: Performance Monitoring Types

export interface ScreenPerformance {
  screenName: string;
  renderTime: number; // milliseconds
  timeToInteractive: number;
  bundleSize: number; // bytes
  memoryUsage: number; // bytes
  timestamp: number;
}

export interface ScrollPerformance {
  screenName: string;
  fps: number;
  droppedFrames: number;
  scrollDuration: number; // milliseconds
  listSize: number;
  timestamp: number;
}

export interface InputPerformance {
  screenName: string;
  inputType: 'text' | 'button' | 'gesture';
  responseTime: number; // milliseconds
  lag: boolean;
  timestamp: number;
}

export interface BundleSize {
  feature: string;
  size: number; // bytes
  compressed: number; // bytes
  percentage: number; // of total bundle
  timestamp: number;
}

export interface PerformanceMetrics {
  screen: ScreenPerformance;
  scroll?: ScrollPerformance;
  input?: InputPerformance;
  bundle: BundleSize;
}

export interface PerformanceThresholds {
  renderTime: number; // ms
  scrollFPS: number;
  inputResponseTime: number; // ms
  bundleSizeIncrease: number; // percentage
}
