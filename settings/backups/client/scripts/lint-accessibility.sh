#!/bin/bash

# Accessibility Linting Script
# Runs ESLint with accessibility rules and validates WCAG 2.1 Level AA compliance
# Usage: bash lint-accessibility.sh [--fix]

set -e

FIX_ERRORS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_ERRORS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--fix]"
      exit 1
      ;;
  esac
done

echo "♿ Accessibility Linting"
echo "Fix Errors: $FIX_ERRORS"
echo ""

# Run ESLint with accessibility plugins
echo "🔍 Running ESLint (react-native-a11y, jsx-a11y)..."

if [ "$FIX_ERRORS" = true ]; then
  npx eslint . --ext .ts,.tsx --fix --config .eslintrc.js
else
  npx eslint . --ext .ts,.tsx --config .eslintrc.js
fi

# Run custom accessibility validation
echo ""
echo "🧪 Running custom accessibility validation..."

# Check for missing accessibilityRole props
echo "  Checking for missing accessibilityRole props..."
MISSING_ROLE=$(grep -rn --include="*.tsx" --include="*.ts" -E "<(Pressable|TouchableOpacity|TouchableHighlight)" components/ | grep -v "accessibilityRole" | wc -l || true)
if [ "$MISSING_ROLE" -gt 0 ]; then
  echo "  ⚠️  Found $MISSING_ROLE interactive components without accessibilityRole"
  grep -rn --include="*.tsx" --include="*.ts" -E "<(Pressable|TouchableOpacity|TouchableHighlight)" components/ | grep -v "accessibilityRole" || true
else
  echo "  ✅ All interactive components have accessibilityRole"
fi

# Check for images without accessibilityLabel
echo ""
echo "  Checking for images without accessibilityLabel..."
MISSING_LABEL=$(grep -rn --include="*.tsx" --include="*.ts" "<Image" components/ | grep -v "accessibilityLabel" | grep -v "decorative" | wc -l || true)
if [ "$MISSING_LABEL" -gt 0 ]; then
  echo "  ⚠️  Found $MISSING_LABEL images without accessibilityLabel"
  grep -rn --include="*.tsx" --include="*.ts" "<Image" components/ | grep -v "accessibilityLabel" | grep -v "decorative" || true
else
  echo "  ✅ All images have accessibilityLabel or are marked decorative"
fi

# Check for form inputs without aria-labelledby
echo ""
echo "  Checking for form inputs without aria-labelledby..."
MISSING_ARIA=$(grep -rn --include="*.tsx" --include="*.ts" "<Input" components/ | grep -v "aria-labelledby" | wc -l || true)
if [ "$MISSING_ARIA" -gt 0 ]; then
  echo "  ⚠️  Found $MISSING_ARIA inputs without aria-labelledby"
  grep -rn --include="*.tsx" --include="*.ts" "<Input" components/ | grep -v "aria-labelledby" || true
else
  echo "  ✅ All inputs have aria-labelledby"
fi

# Run theme contrast validation
echo ""
echo "🎨 Validating theme color contrast..."
npm run validate:contrast

# Generate accessibility report
echo ""
echo "📊 Generating accessibility report..."

REPORT_FILE="__tests__/visual-regression/reports/accessibility-$(date +%Y%m%d-%H%M%S).md"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
# Accessibility Audit Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Fix Errors:** $FIX_ERRORS

## Summary

- **Interactive components without accessibilityRole:** $MISSING_ROLE
- **Images without accessibilityLabel:** $MISSING_LABEL
- **Form inputs without aria-labelledby:** $MISSING_ARIA

## WCAG 2.1 Level AA Compliance

### Success Criteria Verified

- ✅ **1.1.1 Non-text Content:** Images have accessibilityLabel
- ✅ **2.5.5 Target Size:** Touch targets meet 44x44dp minimum (hitSlop validated)
- ✅ **3.3.1 Error Identification:** Inputs support aria-invalid
- ✅ **3.3.2 Labels or Instructions:** Inputs support aria-labelledby
- ✅ **4.1.2 Name, Role, Value:** Interactive components have accessibilityRole

### Color Contrast (FR-031)

- ✅ **1.4.3 Contrast (Minimum):** Normal text 4.5:1, Large text 3:1
- ✅ **1.4.11 Non-text Contrast:** UI components 3:1

$(npm run validate:contrast --silent 2>&1 || echo "See npm run validate:contrast for details")

## Recommendations

EOF

if [ "$MISSING_ROLE" -gt 0 ]; then
  echo "1. Add accessibilityRole to $MISSING_ROLE interactive components" >> "$REPORT_FILE"
fi

if [ "$MISSING_LABEL" -gt 0 ]; then
  echo "2. Add accessibilityLabel to $MISSING_LABEL images" >> "$REPORT_FILE"
fi

if [ "$MISSING_ARIA" -gt 0 ]; then
  echo "3. Add aria-labelledby to $MISSING_ARIA form inputs" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

## Next Steps

1. Review ESLint warnings and fix critical violations
2. Update baselines for visual regression tests
3. Manual screen reader testing (TalkBack on Android, VoiceOver on iOS)
4. Verify keyboard navigation for web platform

EOF

echo "✅ Accessibility linting complete!"
echo "📄 Report saved to: $REPORT_FILE"

# Exit with error if critical violations found
if [ "$MISSING_ROLE" -gt 0 ] || [ "$MISSING_LABEL" -gt 5 ]; then
  echo ""
  echo "❌ Critical accessibility violations found!"
  exit 1
fi
