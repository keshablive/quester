#!/bin/bash

# Visual Regression Testing Script for React Native Components
# Captures screenshots of all 32 UI components and compares against baselines
# Usage: bash test-visual-regression.sh [--mode=light|dark|both] [--platform=ios|android|both] [--update-baselines]

set -e

# Default values
MODE="light"
PLATFORM="both"
UPDATE_BASELINES=false
BASELINE_DIR="__tests__/visual-regression/baselines"
SNAPSHOT_DIR="__tests__/visual-regression/snapshots"
REPORT_DIR="__tests__/visual-regression/reports"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --platform=*)
      PLATFORM="${1#*=}"
      shift
      ;;
    --update-baselines)
      UPDATE_BASELINES=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--mode=light|dark|both] [--platform=ios|android|both] [--update-baselines]"
      exit 1
      ;;
  esac
done

echo "📸 Visual Regression Testing"
echo "Mode: $MODE"
echo "Platform: $PLATFORM"
echo "Update Baselines: $UPDATE_BASELINES"
echo ""

# Ensure directories exist
mkdir -p "$BASELINE_DIR"/{ios,android}/{light,dark}
mkdir -p "$SNAPSHOT_DIR"/{ios,android}/{light,dark}
mkdir -p "$REPORT_DIR"

# Function to run tests for a specific mode and platform
run_tests() {
  local test_mode=$1
  local test_platform=$2
  
  echo "🧪 Running tests: $test_platform / $test_mode mode"
  
  if [ "$UPDATE_BASELINES" = true ]; then
    echo "📝 Updating baselines..."
    DETOX_CONFIGURATION="$test_platform.release" \
    COLOR_SCHEME="$test_mode" \
    UPDATE_BASELINES=true \
    npx jest --testMatch="**/__tests__/visual-regression/*.test.ts*" --detectOpenHandles --runInBand
  else
    echo "🔍 Comparing against baselines..."
    DETOX_CONFIGURATION="$test_platform.release" \
    COLOR_SCHEME="$test_mode" \
    npx jest --testMatch="**/__tests__/visual-regression/*.test.ts*" --detectOpenHandles --runInBand
  fi
}

# Run tests based on platform selection
if [ "$PLATFORM" = "both" ]; then
  PLATFORMS=("ios" "android")
else
  PLATFORMS=("$PLATFORM")
fi

# Run tests based on mode selection
if [ "$MODE" = "both" ]; then
  MODES=("light" "dark")
else
  MODES=("$MODE")
fi

# Execute tests
for platform in "${PLATFORMS[@]}"; do
  for mode in "${MODES[@]}"; do
    run_tests "$mode" "$platform"
  done
done

# Generate summary report
echo ""
echo "📊 Generating summary report..."

REPORT_FILE="$REPORT_DIR/summary-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Visual Regression Test Summary

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Mode:** $MODE
**Platform:** $PLATFORM
**Baselines Updated:** $UPDATE_BASELINES

## Test Results

EOF

# Count files in each directory
for platform in "${PLATFORMS[@]}"; do
  for mode in "${MODES[@]}"; do
    baseline_count=$(find "$BASELINE_DIR/$platform/$mode" -type f -name "*.png" 2>/dev/null | wc -l)
    snapshot_count=$(find "$SNAPSHOT_DIR/$platform/$mode" -type f -name "*.png" 2>/dev/null | wc -l)
    
    echo "### $platform / $mode" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "- **Baseline Images:** $baseline_count" >> "$REPORT_FILE"
    echo "- **Test Snapshots:** $snapshot_count" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  done
done

cat >> "$REPORT_FILE" << EOF

## Components Tested (32 total)

1. accordion.tsx
2. aspect-ratio.tsx
3. avatar.tsx
4. badge.tsx
5. button.tsx
6. card.tsx
7. checkbox.tsx
8. collapsible.tsx
9. context-menu.tsx
10. dialog.tsx
11. dropdown-menu.tsx
12. hover-card.tsx
13. icon.tsx
14. input.tsx
15. label.tsx
16. menubar.tsx
17. popover.tsx
18. progress.tsx
19. radio-group.tsx
20. select.tsx
21. separator.tsx
22. skeleton.tsx
23. switch.tsx
24. tabs.tsx
25. text.tsx
26. textarea.tsx
27. toggle.tsx
28. toggle-group.tsx
29. tooltip.tsx
30. password-strength-meter.tsx
31. native-only-animated-view.tsx
32. error-boundary.tsx

## Notes

- Visual regression tests use jest-image-snapshot for pixel-perfect comparison
- Threshold: 0.01 (1% difference allowed for anti-aliasing)
- Baseline updates require manual review before committing

EOF

echo "✅ Visual regression testing complete!"
echo "📄 Report saved to: $REPORT_FILE"
