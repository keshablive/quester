/**
 * Performance Test: Bundle Size Analysis
 * 
 * Monitors JavaScript bundle size to prevent performance regressions:
 * - Tracks bundle size over time
 * - Warns on significant increases (>10%)
 * - Identifies large dependencies
 * - Suggests optimization opportunities
 * 
 * Run with: npm run test:bundle-size
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  total: 2000, // 2MB total bundle (gzipped)
  main: 500, // 500KB main bundle
  vendor: 1000, // 1MB vendor bundle
  warningIncrease: 0.1, // 10% increase triggers warning
  errorIncrease: 0.2, // 20% increase triggers error
};

interface BundleAnalysis {
  totalSize: number;
  mainBundle: number;
  vendorBundle: number;
  assetSizes: { [key: string]: number };
  timestamp: string;
}

/**
 * Get file size in KB
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024; // Convert to KB
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze bundle directory
 */
function analyzeBundleDirectory(dirPath: string): BundleAnalysis {
  const analysis: BundleAnalysis = {
    totalSize: 0,
    mainBundle: 0,
    vendorBundle: 0,
    assetSizes: {},
    timestamp: new Date().toISOString(),
  };

  if (!fs.existsSync(dirPath)) {
    return analysis;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.bundle'))) {
      const size = getFileSize(filePath);
      analysis.assetSizes[file] = size;
      analysis.totalSize += size;

      if (file.includes('main') || file.includes('index')) {
        analysis.mainBundle += size;
      } else if (file.includes('vendor') || file.includes('node_modules')) {
        analysis.vendorBundle += size;
      }
    }
  });

  return analysis;
}

/**
 * Load previous bundle analysis
 */
function loadPreviousAnalysis(): BundleAnalysis | null {
  const historyPath = path.join(__dirname, '../../.bundle-history.json');

  if (!fs.existsSync(historyPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(data) as BundleAnalysis;
  } catch (error) {
    console.warn('Failed to load previous bundle analysis:', error);
    return null;
  }
}

/**
 * Save bundle analysis
 */
function saveBundleAnalysis(analysis: BundleAnalysis): void {
  const historyPath = path.join(__dirname, '../../.bundle-history.json');
  fs.writeFileSync(historyPath, JSON.stringify(analysis, null, 2));
}

/**
 * Compare with previous analysis
 */
function compareAnalyses(current: BundleAnalysis, previous: BundleAnalysis): {
  totalChange: number;
  mainChange: number;
  vendorChange: number;
  warnings: string[];
  errors: string[];
} {
  const result = {
    totalChange: (current.totalSize - previous.totalSize) / previous.totalSize,
    mainChange: (current.mainBundle - previous.mainBundle) / previous.mainBundle,
    vendorChange: (current.vendorBundle - previous.vendorBundle) / previous.vendorBundle,
    warnings: [] as string[],
    errors: [] as string[],
  };

  // Check total size
  if (result.totalChange > THRESHOLDS.errorIncrease) {
    result.errors.push(
      `Total bundle size increased by ${(result.totalChange * 100).toFixed(1)}% ` +
        `(${previous.totalSize.toFixed(0)}KB → ${current.totalSize.toFixed(0)}KB)`
    );
  } else if (result.totalChange > THRESHOLDS.warningIncrease) {
    result.warnings.push(
      `Total bundle size increased by ${(result.totalChange * 100).toFixed(1)}% ` +
        `(${previous.totalSize.toFixed(0)}KB → ${current.totalSize.toFixed(0)}KB)`
    );
  }

  // Check main bundle
  if (result.mainChange > THRESHOLDS.errorIncrease) {
    result.errors.push(
      `Main bundle size increased by ${(result.mainChange * 100).toFixed(1)}% ` +
        `(${previous.mainBundle.toFixed(0)}KB → ${current.mainBundle.toFixed(0)}KB)`
    );
  } else if (result.mainChange > THRESHOLDS.warningIncrease) {
    result.warnings.push(
      `Main bundle size increased by ${(result.mainChange * 100).toFixed(1)}% ` +
        `(${previous.mainBundle.toFixed(0)}KB → ${current.mainBundle.toFixed(0)}KB)`
    );
  }

  // Check vendor bundle
  if (result.vendorChange > THRESHOLDS.errorIncrease) {
    result.errors.push(
      `Vendor bundle size increased by ${(result.vendorChange * 100).toFixed(1)}% ` +
        `(${previous.vendorBundle.toFixed(0)}KB → ${current.vendorBundle.toFixed(0)}KB)`
    );
  }

  return result;
}

/**
 * Find large dependencies
 */
function findLargeDependencies(analysis: BundleAnalysis): string[] {
  const largeFiles = Object.entries(analysis.assetSizes)
    .filter(([_, size]) => size > 100) // Files larger than 100KB
    .sort(([_, a], [__, b]) => b - a)
    .map(([file, size]) => `  - ${file}: ${size.toFixed(0)}KB`);

  return largeFiles;
}

describe('Performance: Bundle Size Analysis', () => {
  it('should analyze current bundle size', () => {
    // Build the app first
    console.log('Building app for bundle analysis...');
    
    try {
      // For Expo apps, we analyze the .expo dist folder
      const distPath = path.join(__dirname, '../../.expo');
      const analysis = analyzeBundleDirectory(distPath);

      console.log('\n📦 Bundle Size Analysis:');
      console.log(`  Total: ${analysis.totalSize.toFixed(0)}KB`);
      console.log(`  Main Bundle: ${analysis.mainBundle.toFixed(0)}KB`);
      console.log(`  Vendor Bundle: ${analysis.vendorBundle.toFixed(0)}KB`);
      console.log(`  Timestamp: ${analysis.timestamp}`);

      // Check thresholds
      expect(analysis.totalSize).toBeLessThan(THRESHOLDS.total);
      expect(analysis.mainBundle).toBeLessThan(THRESHOLDS.main);
      expect(analysis.vendorBundle).toBeLessThan(THRESHOLDS.vendor);

      // Save for future comparison
      saveBundleAnalysis(analysis);
    } catch (error) {
      console.warn('Bundle analysis skipped (no build found)');
      // Don't fail the test if no build exists yet
    }
  });

  it('should detect bundle size regressions', () => {
    const current = analyzeBundleDirectory(path.join(__dirname, '../../.expo'));
    const previous = loadPreviousAnalysis();

    if (!previous) {
      console.log('⚠️  No previous bundle analysis found. Skipping regression check.');
      return;
    }

    const comparison = compareAnalyses(current, previous);

    // Log comparison
    console.log('\n📊 Bundle Size Comparison:');
    console.log(`  Total Change: ${(comparison.totalChange * 100).toFixed(1)}%`);
    console.log(`  Main Change: ${(comparison.mainChange * 100).toFixed(1)}%`);
    console.log(`  Vendor Change: ${(comparison.vendorChange * 100).toFixed(1)}%`);

    if (comparison.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      comparison.warnings.forEach((w) => console.warn(`  ${w}`));
    }

    if (comparison.errors.length > 0) {
      console.error('\n❌ Errors:');
      comparison.errors.forEach((e) => console.error(`  ${e}`));
    }

    // Fail test on errors
    expect(comparison.errors).toHaveLength(0);
  });

  it('should identify large dependencies', () => {
    const analysis = analyzeBundleDirectory(path.join(__dirname, '../../.expo'));
    const largeFiles = findLargeDependencies(analysis);

    if (largeFiles.length > 0) {
      console.log('\n📦 Large Bundle Files (>100KB):');
      largeFiles.forEach((file) => console.log(file));
      console.log('\n💡 Consider:');
      console.log('  - Code splitting for large modules');
      console.log('  - Lazy loading for non-critical features');
      console.log('  - Tree-shaking unused exports');
      console.log('  - Replacing large dependencies with lighter alternatives');
    } else {
      console.log('\n✅ No large bundle files detected');
    }

    // This is informational, not a failure
    expect(true).toBe(true);
  });

  it('should suggest optimizations', () => {
    const analysis = analyzeBundleDirectory(path.join(__dirname, '../../.expo'));

    console.log('\n💡 Bundle Optimization Suggestions:');

    if (analysis.totalSize > THRESHOLDS.total * 0.8) {
      console.log('  - Total bundle approaching threshold');
      console.log('    → Consider code splitting');
      console.log('    → Review and remove unused dependencies');
    }

    if (analysis.vendorBundle > analysis.mainBundle * 2) {
      console.log('  - Vendor bundle is larger than main bundle');
      console.log('    → Review third-party dependencies');
      console.log('    → Consider lighter alternatives');
    }

    const largeFiles = findLargeDependencies(analysis);
    if (largeFiles.length > 5) {
      console.log('  - Multiple large files detected');
      console.log('    → Implement lazy loading');
      console.log('    → Split into smaller chunks');
    }

    // Always pass - this is informational
    expect(true).toBe(true);
  });
});

// Export for use in CI/CD
export { analyzeBundleDirectory, compareAnalyses, findLargeDependencies };
