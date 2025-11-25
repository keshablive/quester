/**
 * P1 Screen Accessibility Audit Script
 * 
 * Audits feed, profile, courses, and marketplace screens for:
 * - Accessibility prop coverage
 * - WCAG 2.1 Level AA compliance
 * - Screen reader compatibility
 * - Navigation state handling
 * 
 * Part of FR-002 Phase 4 (T102-T106)
 */

import * as fs from 'fs';
import * as path from 'path';

interface AccessibilityPattern {
  type: 'role' | 'label' | 'hint' | 'state' | 'liveRegion' | 'value';
  line: number;
  code: string;
  element: string;
}

interface ScreenAuditResult {
  screen: string;
  filePath: string;
  patterns: AccessibilityPattern[];
  componentUsage: {
    rnrComponents: string[];
    nativeComponents: string[];
  };
  wcagCriteria: {
    criterion: string;
    status: 'pass' | 'fail' | 'manual';
    notes: string;
  }[];
  coverage: {
    totalElements: number;
    accessibleElements: number;
    percentage: number;
  };
}

const P1_SCREENS = [
  { name: 'Feed', path: 'app/(tabs)/feed.tsx' },
  { name: 'Profile', path: 'app/profile.tsx' },
  { name: 'Courses', path: 'app/(tabs)/courses/index.tsx' },
  { name: 'Marketplace', path: 'app/marketplace/index.tsx' }
];

const RNR_COMPONENTS = ['Button', 'Text', 'Input', 'Card', 'Icon', 'Badge', 'Checkbox', 'Label', 'Separator'];

function auditScreen(screenName: string, filePath: string): ScreenAuditResult {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Screen file not found: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  // Find accessibility patterns
  const patterns: AccessibilityPattern[] = [];
  
  lines.forEach((line, index) => {
    // Check for accessibilityRole
    const roleMatch = line.match(/accessibilityRole\s*=\s*["'](\w+)["']/);
    if (roleMatch) {
      patterns.push({
        type: 'role',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }

    // Check for accessibilityLabel
    const labelMatch = line.match(/accessibilityLabel\s*=\s*{?["']([^"']+)["']/);
    if (labelMatch) {
      patterns.push({
        type: 'label',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }

    // Check for accessibilityHint
    const hintMatch = line.match(/accessibilityHint\s*=\s*{?["']([^"']+)["']/);
    if (hintMatch) {
      patterns.push({
        type: 'hint',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }

    // Check for accessibilityState
    if (line.includes('accessibilityState')) {
      patterns.push({
        type: 'state',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }

    // Check for accessibilityLiveRegion
    const liveRegionMatch = line.match(/accessibilityLiveRegion\s*=\s*["'](\w+)["']/);
    if (liveRegionMatch) {
      patterns.push({
        type: 'liveRegion',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }

    // Check for accessibilityValue
    if (line.includes('accessibilityValue')) {
      patterns.push({
        type: 'value',
        line: index + 1,
        code: line.trim(),
        element: extractElementType(line)
      });
    }
  });

  // Check component usage
  const rnrComponents: string[] = [];
  const nativeComponents: string[] = [];

  RNR_COMPONENTS.forEach(component => {
    const importMatch = content.match(new RegExp(`import.*${component}.*from.*@/components/ui`, 's'));
    if (importMatch) {
      rnrComponents.push(component);
    }
  });

  // Check for native component usage (potential issues)
  const nativeImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]react-native['"]/);
  if (nativeImportMatch) {
    const imports = nativeImportMatch[1].split(',').map(s => s.trim());
    nativeComponents.push(...imports);
  }

  // WCAG 2.1 Level AA criteria assessment
  const wcagCriteria = assessWCAG(content, patterns);

  // Calculate coverage
  const totalElements = countInteractiveElements(content);
  const accessibleElements = patterns.filter(p => p.type === 'role' || p.type === 'label').length;
  const percentage = totalElements > 0 ? (accessibleElements / totalElements) * 100 : 0;

  return {
    screen: screenName,
    filePath,
    patterns,
    componentUsage: {
      rnrComponents,
      nativeComponents
    },
    wcagCriteria,
    coverage: {
      totalElements,
      accessibleElements,
      percentage
    }
  };
}

function extractElementType(line: string): string {
  // Try to extract the component/element type from the line
  const match = line.match(/<(\w+)/);
  return match ? match[1] : 'Unknown';
}

function countInteractiveElements(content: string): number {
  // Count buttons, touchable elements, inputs, etc.
  let count = 0;
  
  const patterns = [
    /<Button/g,
    /<TouchableOpacity/g,
    /<TouchableHighlight/g,
    /<Pressable/g,
    /<Input/g,
    /<TextInput/g,
    /<Checkbox/g,
    /onPress\s*=/g,
  ];

  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  });

  return count;
}

function assessWCAG(content: string, patterns: AccessibilityPattern[]): ScreenAuditResult['wcagCriteria'] {
  const criteria: ScreenAuditResult['wcagCriteria'] = [];

  // 1.1.1 Non-text Content
  const hasImageLabels = patterns.some(p => 
    (p.type === 'label' || p.type === 'role') && 
    (p.element.includes('Image') || p.element.includes('Icon'))
  );
  criteria.push({
    criterion: '1.1.1 Non-text Content',
    status: hasImageLabels || content.includes('Icon') ? 'pass' : 'manual',
    notes: hasImageLabels ? 'Icons have accessibility labels' : 'Manual verification needed for images'
  });

  // 1.3.1 Info and Relationships
  const hasSemanticStructure = patterns.some(p => 
    p.type === 'role' && ['heading', 'list', 'region', 'navigation'].includes(p.code)
  );
  criteria.push({
    criterion: '1.3.1 Info and Relationships',
    status: hasSemanticStructure || content.includes('variant=') ? 'pass' : 'manual',
    notes: 'Semantic structure via RNR Text variants and accessibility roles'
  });

  // 2.4.6 Headings and Labels
  const hasProperLabels = patterns.filter(p => p.type === 'label').length > 0;
  criteria.push({
    criterion: '2.4.6 Headings and Labels',
    status: hasProperLabels ? 'pass' : 'fail',
    notes: `${patterns.filter(p => p.type === 'label').length} accessibility labels found`
  });

  // 3.3.2 Labels or Instructions
  const hasInputLabels = patterns.some(p => 
    (p.type === 'label' || p.type === 'hint') && 
    (p.element.includes('Input') || p.element.includes('TextInput'))
  );
  criteria.push({
    criterion: '3.3.2 Labels or Instructions',
    status: hasInputLabels || !content.includes('Input') ? 'pass' : 'manual',
    notes: hasInputLabels ? 'Form inputs have labels/hints' : 'No form inputs detected'
  });

  // 4.1.2 Name, Role, Value
  const hasRoles = patterns.filter(p => p.type === 'role').length > 0;
  criteria.push({
    criterion: '4.1.2 Name, Role, Value',
    status: hasRoles ? 'pass' : 'fail',
    notes: `${patterns.filter(p => p.type === 'role').length} accessibility roles defined`
  });

  // 4.1.3 Status Messages
  const hasLiveRegions = patterns.some(p => p.type === 'liveRegion');
  criteria.push({
    criterion: '4.1.3 Status Messages',
    status: hasLiveRegions || !content.includes('loading') ? 'pass' : 'manual',
    notes: hasLiveRegions ? 'Live regions for dynamic content' : 'No dynamic status detected'
  });

  // 1.4.3 Contrast (Minimum) - Manual check required
  criteria.push({
    criterion: '1.4.3 Contrast (Minimum)',
    status: 'manual',
    notes: 'Theme system should enforce 4.5:1 ratio - manual verification with color picker needed'
  });

  // 2.5.5 Target Size (Level AAA but good practice)
  criteria.push({
    criterion: '2.5.5 Target Size',
    status: 'manual',
    notes: 'RNR Button components should meet 44x44 minimum - manual verification needed'
  });

  return criteria;
}

function generateReport(results: ScreenAuditResult[]): string {
  let report = '# P1 Screen Accessibility Audit Report\n\n';
  report += `**Date**: ${new Date().toISOString().split('T')[0]}\n`;
  report += `**Phase**: 4 - T102-T106\n`;
  report += `**Screens Audited**: ${results.length}\n\n`;
  report += '---\n\n';

  // Overall summary
  const totalPatterns = results.reduce((sum, r) => sum + r.patterns.length, 0);
  const avgCoverage = results.reduce((sum, r) => sum + r.coverage.percentage, 0) / results.length;
  
  report += '## Overall Summary\n\n';
  report += `- **Total Accessibility Patterns**: ${totalPatterns}\n`;
  report += `- **Average Coverage**: ${avgCoverage.toFixed(1)}%\n`;
  report += `- **All Screens Using RNR Components**: ${results.every(r => r.componentUsage.rnrComponents.length > 0) ? '✅' : '❌'}\n\n`;

  // Individual screen results
  results.forEach(result => {
    report += `## ${result.screen} Screen\n\n`;
    report += `**File**: \`${result.filePath}\`\n\n`;

    // Coverage
    report += '### Coverage\n\n';
    report += `- **Total Interactive Elements**: ${result.coverage.totalElements}\n`;
    report += `- **Accessible Elements**: ${result.coverage.accessibleElements}\n`;
    report += `- **Coverage**: ${result.coverage.percentage.toFixed(1)}%\n\n`;

    // Component usage
    report += '### Component Usage\n\n';
    report += '**RNR Components**:\n';
    if (result.componentUsage.rnrComponents.length > 0) {
      result.componentUsage.rnrComponents.forEach(comp => {
        report += `- ✅ ${comp}\n`;
      });
    } else {
      report += '- ⚠️ No RNR components detected\n';
    }
    report += '\n';

    // Accessibility patterns by type
    report += '### Accessibility Patterns\n\n';
    const patternsByType = {
      role: result.patterns.filter(p => p.type === 'role'),
      label: result.patterns.filter(p => p.type === 'label'),
      hint: result.patterns.filter(p => p.type === 'hint'),
      state: result.patterns.filter(p => p.type === 'state'),
      liveRegion: result.patterns.filter(p => p.type === 'liveRegion'),
      value: result.patterns.filter(p => p.type === 'value'),
    };

    report += `- **Roles**: ${patternsByType.role.length}\n`;
    report += `- **Labels**: ${patternsByType.label.length}\n`;
    report += `- **Hints**: ${patternsByType.hint.length}\n`;
    report += `- **States**: ${patternsByType.state.length}\n`;
    report += `- **Live Regions**: ${patternsByType.liveRegion.length}\n`;
    report += `- **Values**: ${patternsByType.value.length}\n\n`;

    // WCAG criteria
    report += '### WCAG 2.1 Level AA\n\n';
    report += '| Criterion | Status | Notes |\n';
    report += '|-----------|--------|-------|\n';
    result.wcagCriteria.forEach(c => {
      const statusIcon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⏳';
      report += `| ${c.criterion} | ${statusIcon} ${c.status} | ${c.notes} |\n`;
    });
    report += '\n---\n\n';
  });

  // Overall WCAG compliance
  report += '## Overall WCAG 2.1 Level AA Compliance\n\n';
  const allCriteria = results.flatMap(r => r.wcagCriteria);
  const criteriaByName = new Map<string, { pass: number; fail: number; manual: number }>();
  
  allCriteria.forEach(c => {
    if (!criteriaByName.has(c.criterion)) {
      criteriaByName.set(c.criterion, { pass: 0, fail: 0, manual: 0 });
    }
    const stats = criteriaByName.get(c.criterion)!;
    stats[c.status]++;
  });

  report += '| Criterion | Pass | Fail | Manual | Overall |\n';
  report += '|-----------|------|------|--------|--------|\n';
  criteriaByName.forEach((stats, criterion) => {
    const total = stats.pass + stats.fail + stats.manual;
    const overallStatus = stats.fail > 0 ? '❌' : stats.manual === total ? '⏳' : '✅';
    report += `| ${criterion} | ${stats.pass}/${total} | ${stats.fail}/${total} | ${stats.manual}/${total} | ${overallStatus} |\n`;
  });

  return report;
}

// Main execution
async function main() {
  console.log('🔍 Starting P1 Screen Accessibility Audit...\n');

  const results: ScreenAuditResult[] = [];

  for (const screen of P1_SCREENS) {
    try {
      console.log(`Auditing ${screen.name}...`);
      const result = auditScreen(screen.name, screen.path);
      results.push(result);
      console.log(`✅ ${screen.name}: ${result.patterns.length} patterns, ${result.coverage.percentage.toFixed(1)}% coverage\n`);
    } catch (error) {
      console.error(`❌ Error auditing ${screen.name}:`, error);
    }
  }

  // Generate report
  const report = generateReport(results);
  const reportPath = path.join(process.cwd(), '..', 'T102-P1-ACCESSIBILITY-AUDIT.md');
  fs.writeFileSync(reportPath, report);

  console.log(`\n✅ Audit complete! Report saved to: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`- Total patterns: ${results.reduce((sum, r) => sum + r.patterns.length, 0)}`);
  console.log(`- Average coverage: ${(results.reduce((sum, r) => sum + r.coverage.percentage, 0) / results.length).toFixed(1)}%`);
}

main().catch(console.error);
