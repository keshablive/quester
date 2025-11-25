/**
 * P1 Screen Performance Profiling Script (T131-T138)
 * 
 * Analyzes P1 screens for:
 * - Component render complexity
 * - Memoization effectiveness
 * - Expected render times
 * - Performance bottlenecks
 * 
 * Phase 5: Performance Optimization
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ComponentAnalysis {
  screenName: string;
  filePath: string;
  lineCount: number;
  componentCount: number;
  memoizationPatterns: {
    useCallback: number;
    useMemo: number;
    reactMemo: number;
  };
  stateVariables: number;
  effects: number;
  flatListOptimizations: string[];
  expectedRenderTime: string;
  performanceScore: number;
  recommendations: string[];
}

const P1_SCREENS = [
  {
    name: 'FeedScreen',
    path: 'app/(tabs)/feed.tsx',
    type: 'FlatList',
  },
  {
    name: 'ProfileScreen',
    path: 'app/profile.tsx',
    type: 'ScrollView',
  },
  {
    name: 'CoursesScreen',
    path: 'app/(tabs)/courses/index.tsx',
    type: 'ScrollView',
  },
  {
    name: 'MarketplaceScreen',
    path: 'app/marketplace/index.tsx',
    type: 'FlatList',
  },
];

function analyzeScreen(screenPath: string, screenName: string, type: string): ComponentAnalysis {
  const fullPath = path.join(__dirname, '..', screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  // Count patterns
  const useCallbackCount = (content.match(/useCallback\(/g) || []).length;
  const useMemoCount = (content.match(/useMemo\(/g) || []).length;
  const reactMemoCount = (content.match(/React\.memo\(/g) || []).length;
  const stateCount = (content.match(/useState\(/g) || []).length;
  const effectCount = (content.match(/useEffect\(/g) || []).length;
  const componentMatches = content.match(/(?:function|const)\s+\w+(?:Component|Card|Item|Header|Footer)/g) || [];

  // Check FlatList optimizations
  const optimizations: string[] = [];
  if (content.includes('getItemLayout')) optimizations.push('getItemLayout');
  if (content.includes('removeClippedSubviews')) optimizations.push('removeClippedSubviews');
  if (content.includes('maxToRenderPerBatch')) optimizations.push('maxToRenderPerBatch');
  if (content.includes('windowSize')) optimizations.push('windowSize');
  if (content.includes('initialNumToRender')) optimizations.push('initialNumToRender');
  if (content.includes('keyExtractor')) optimizations.push('keyExtractor');

  // Calculate performance score (0-100)
  let score = 50; // Base score

  // Memoization bonus
  const totalMemoization = useCallbackCount + useMemoCount + reactMemoCount;
  if (totalMemoization >= 10) score += 20;
  else if (totalMemoization >= 5) score += 10;
  else score -= 10;

  // FlatList optimization bonus
  if (type === 'FlatList') {
    if (optimizations.includes('getItemLayout')) score += 10;
    if (optimizations.includes('removeClippedSubviews')) score += 5;
    if (optimizations.length >= 4) score += 10;
    else if (optimizations.length < 2) score -= 15;
  }

  // Complexity penalty
  if (lines.length > 400) score -= 10;
  if (stateCount > 10) score -= 5;
  if (effectCount > 5) score -= 5;

  score = Math.max(0, Math.min(100, score));

  // Expected render time based on complexity
  let expectedTime = '< 500ms';
  if (type === 'FlatList' && optimizations.length >= 4) {
    expectedTime = '< 300ms';
  } else if (lines.length > 300 || stateCount > 8) {
    expectedTime = '< 800ms';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (useCallbackCount < 3 && type === 'FlatList') {
    recommendations.push('Consider memoizing more FlatList callbacks (handlePress, renderItem, etc.)');
  }
  
  if (useMemoCount === 0 && stateCount > 5) {
    recommendations.push('Consider using useMemo for expensive computations or filtered data');
  }
  
  if (type === 'FlatList' && !optimizations.includes('getItemLayout')) {
    recommendations.push('Add getItemLayout for fixed-height items to improve scroll performance');
  }
  
  if (type === 'FlatList' && !optimizations.includes('removeClippedSubviews')) {
    recommendations.push('Enable removeClippedSubviews for better memory management');
  }
  
  if (reactMemoCount === 0 && componentMatches.length > 0) {
    recommendations.push('Consider wrapping child components in React.memo to prevent unnecessary re-renders');
  }

  if (recommendations.length === 0) {
    recommendations.push('No major optimizations needed - screen is well-optimized');
  }

  return {
    screenName,
    filePath: screenPath,
    lineCount: lines.length,
    componentCount: componentMatches.length,
    memoizationPatterns: {
      useCallback: useCallbackCount,
      useMemo: useMemoCount,
      reactMemo: reactMemoCount,
    },
    stateVariables: stateCount,
    effects: effectCount,
    flatListOptimizations: optimizations,
    expectedRenderTime: expectedTime,
    performanceScore: score,
    recommendations,
  };
}

function generateReport(analyses: ComponentAnalysis[]): void {
  console.log('\n='.repeat(80));
  console.log('P1 SCREEN PERFORMANCE PROFILING REPORT (T131-T138)');
  console.log('='.repeat(80));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Screens Analyzed: ${analyses.length}`);
  console.log('='.repeat(80));

  analyses.forEach((analysis, index) => {
    console.log(`\n${index + 1}. ${analysis.screenName}`);
    console.log('-'.repeat(80));
    console.log(`   File: ${analysis.filePath}`);
    console.log(`   Lines of Code: ${analysis.lineCount}`);
    console.log(`   Performance Score: ${analysis.performanceScore}/100`);
    console.log(`   Expected Render Time: ${analysis.expectedRenderTime}`);
    console.log(`\n   Complexity Metrics:`);
    console.log(`   - Component Count: ${analysis.componentCount}`);
    console.log(`   - State Variables: ${analysis.stateVariables}`);
    console.log(`   - Effects: ${analysis.effects}`);
    console.log(`\n   Memoization Patterns:`);
    console.log(`   - useCallback: ${analysis.memoizationPatterns.useCallback}`);
    console.log(`   - useMemo: ${analysis.memoizationPatterns.useMemo}`);
    console.log(`   - React.memo: ${analysis.memoizationPatterns.reactMemo}`);
    console.log(`   - Total: ${analysis.memoizationPatterns.useCallback + analysis.memoizationPatterns.useMemo + analysis.memoizationPatterns.reactMemo}`);
    
    if (analysis.flatListOptimizations.length > 0) {
      console.log(`\n   FlatList Optimizations: ${analysis.flatListOptimizations.join(', ')}`);
    }
    
    console.log(`\n   Recommendations:`);
    analysis.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  });

  // Summary
  const avgScore = Math.round(analyses.reduce((sum, a) => sum + a.performanceScore, 0) / analyses.length);
  const totalMemoization = analyses.reduce((sum, a) => 
    sum + a.memoizationPatterns.useCallback + a.memoizationPatterns.useMemo + a.memoizationPatterns.reactMemo, 0
  );

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Average Performance Score: ${avgScore}/100`);
  console.log(`Total Memoization Patterns: ${totalMemoization}`);
  console.log(`Screens with Score >= 70: ${analyses.filter(a => a.performanceScore >= 70).length}/${analyses.length}`);
  console.log(`Screens with Score < 70: ${analyses.filter(a => a.performanceScore < 70).length}/${analyses.length}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL ASSESSMENT');
  console.log('='.repeat(80));
  
  if (avgScore >= 80) {
    console.log('✅ EXCELLENT - All P1 screens are well-optimized for production');
  } else if (avgScore >= 70) {
    console.log('✅ GOOD - P1 screens meet performance targets with minor room for improvement');
  } else if (avgScore >= 60) {
    console.log('⚠️  FAIR - P1 screens functional but could benefit from optimization');
  } else {
    console.log('❌ NEEDS IMPROVEMENT - Significant optimization work recommended');
  }

  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION STATUS');
  console.log('='.repeat(80));
  console.log(`✅ Static Analysis: Complete`);
  console.log(`⏳ React DevTools Profiling: Requires running app`);
  console.log(`⏳ Device Testing: Requires physical device or emulator`);
  console.log(`⏳ TTI Measurement: Requires running app`);
  console.log('\n' + '='.repeat(80));
}

// Run analysis
const analyses = P1_SCREENS.map(screen => 
  analyzeScreen(screen.path, screen.name, screen.type)
);

generateReport(analyses);

// Export for use in validation report
export { analyses };
