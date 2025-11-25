/**
 * Theme Contrast Validation CI Check
 * 
 * Validates that all theme colors meet WCAG 2.1 Level AA contrast requirements.
 * Run this in CI to prevent deploying inaccessible color combinations.
 * 
 * Implements T024: CI contrast validation
 * Implements FR-031: WCAG 2.1 Level AA color contrast requirements
 * 
 * @module validate-theme-contrast-ci
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateColorContrast } from '@/lib/utils/validate-contrast';

interface Theme {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Extract theme colors from global.css
 */
function extractThemeColors(cssPath: string): Theme {
  const css = readFileSync(cssPath, 'utf-8');
  
  const theme: Theme = {
    light: {},
    dark: {},
  };

  // Extract CSS variables from :root (light mode)
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
  if (rootMatch) {
    const vars = rootMatch[1].matchAll(/--([a-z-]+):\s*([^;]+);/g);
    for (const [, name, value] of vars) {
      // Convert HSL to hex (simplified - assumes hsl(h, s%, l%) format)
      const hslMatch = value.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
      if (hslMatch) {
        const [, h, s, l] = hslMatch.map(Number);
        theme.light[name] = hslToHex(h, s, l);
      }
    }
  }

  // Extract CSS variables from .dark (dark mode)
  const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/s);
  if (darkMatch) {
    const vars = darkMatch[1].matchAll(/--([a-z-]+):\s*([^;]+);/g);
    for (const [, name, value] of vars) {
      const hslMatch = value.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
      if (hslMatch) {
        const [, h, s, l] = hslMatch.map(Number);
        theme.dark[name] = hslToHex(h, s, l);
      }
    }
  }

  return theme;
}

/**
 * Convert HSL to Hex
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Validate theme contrast ratios
 */
function validateTheme(theme: Theme, mode: 'light' | 'dark'): {
  passed: boolean;
  failures: Array<{ pair: string; ratio: number; required: number }>;
} {
  const colors = theme[mode];
  const failures: Array<{ pair: string; ratio: number; required: number }> = [];

  // Check critical color pairs
  const pairs = [
    { fg: 'foreground', bg: 'background', large: false },
    { fg: 'primary-foreground', bg: 'primary', large: false },
    { fg: 'secondary-foreground', bg: 'secondary', large: false },
    { fg: 'destructive-foreground', bg: 'destructive', large: false },
    { fg: 'muted-foreground', bg: 'muted', large: false },
    { fg: 'accent-foreground', bg: 'accent', large: false },
    { fg: 'card-foreground', bg: 'card', large: false },
  ];

  for (const { fg, bg, large } of pairs) {
    const fgColor = colors[fg];
    const bgColor = colors[bg];

    if (!fgColor || !bgColor) {
      console.warn(`Missing color definition: ${fg} or ${bg}`);
      continue;
    }

    const result = validateColorContrast(fgColor, bgColor, large);
    
    if (!result.passes) {
      failures.push({
        pair: `${fg}/${bg}`,
        ratio: result.ratio,
        required: result.required,
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Main validation function
 */
function main(): void {
  console.log('🎨 Validating theme color contrast ratios...\n');

  const cssPath = resolve(__dirname, '../global.css');
  
  try {
    const theme = extractThemeColors(cssPath);

    // Validate light mode
    console.log('☀️  Light mode:');
    const lightResult = validateTheme(theme, 'light');
    
    if (lightResult.passed) {
      console.log('   ✅ All color pairs pass WCAG 2.1 Level AA\n');
    } else {
      console.log('   ❌ Contrast failures:\n');
      lightResult.failures.forEach(({ pair, ratio, required }) => {
        console.log(`      ${pair}: ${ratio.toFixed(2)}:1 (required ${required}:1)`);
      });
      console.log('');
    }

    // Validate dark mode
    console.log('🌙 Dark mode:');
    const darkResult = validateTheme(theme, 'dark');
    
    if (darkResult.passed) {
      console.log('   ✅ All color pairs pass WCAG 2.1 Level AA\n');
    } else {
      console.log('   ❌ Contrast failures:\n');
      darkResult.failures.forEach(({ pair, ratio, required }) => {
        console.log(`      ${pair}: ${ratio.toFixed(2)}:1 (required ${required}:1)`);
      });
      console.log('');
    }

    // Exit with error if any failures
    const totalFailures = lightResult.failures.length + darkResult.failures.length;
    
    if (totalFailures > 0) {
      console.log(`❌ Theme validation failed: ${totalFailures} contrast issue(s)`);
      console.log('\nTo fix:');
      console.log('  1. Update colors in global.css');
      console.log('  2. Use validateColorContrast() to test changes');
      console.log('  3. Ensure all pairs meet WCAG 2.1 Level AA (4.5:1 normal, 3:1 large)\n');
      process.exit(1);
    }

    console.log('✅ Theme validation passed!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error validating theme:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { extractThemeColors, validateTheme };
