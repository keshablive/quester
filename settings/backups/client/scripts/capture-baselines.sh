#!/bin/bash
#
# Visual Regression Baseline Capture Script
# 
# Captures baseline screenshots for all screens in both light and dark mode.
# Run this before making UI changes to establish visual regression baselines.
#
# Usage: ./capture-baselines.sh
# Options:
#   --screens=screen1,screen2  Capture specific screens only
#   --mode=light|dark|both     Capture specific color scheme (default: both)
#   --device=ios|android       Capture for specific platform (default: both)
#
# Implements T025: Visual regression baseline capture

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default configuration
BASELINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/__tests__/visual-regression/baselines"
MODE="both"
DEVICE="both"
SCREENS=""

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --screens=*)
      SCREENS="${arg#*=}"
      shift
      ;;
    --mode=*)
      MODE="${arg#*=}"
      shift
      ;;
    --device=*)
      DEVICE="${arg#*=}"
      shift
      ;;
    --help)
      echo "Visual Regression Baseline Capture Script"
      echo ""
      echo "Usage: ./capture-baselines.sh [options]"
      echo ""
      echo "Options:"
      echo "  --screens=screen1,screen2  Capture specific screens only"
      echo "  --mode=light|dark|both     Capture specific color scheme (default: both)"
      echo "  --device=ios|android       Capture for specific platform (default: both)"
      echo "  --help                     Show this help message"
      exit 0
      ;;
  esac
done

# Validate mode
if [[ ! "$MODE" =~ ^(light|dark|both)$ ]]; then
  echo -e "${RED}Error: Invalid mode '$MODE'. Must be 'light', 'dark', or 'both'${NC}"
  exit 1
fi

# Validate device
if [[ ! "$DEVICE" =~ ^(ios|android|both)$ ]]; then
  echo -e "${RED}Error: Invalid device '$DEVICE'. Must be 'ios', 'android', or 'both'${NC}"
  exit 1
fi

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}Visual Regression Baseline Capture${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "Baseline directory: ${GREEN}${BASELINE_DIR}${NC}"
echo -e "Mode: ${GREEN}${MODE}${NC}"
echo -e "Device: ${GREEN}${DEVICE}${NC}"
if [ -n "$SCREENS" ]; then
  echo -e "Screens: ${GREEN}${SCREENS}${NC}"
fi
echo ""

# Create baseline directories if they don't exist
mkdir -p "${BASELINE_DIR}/ios/light"
mkdir -p "${BASELINE_DIR}/ios/dark"
mkdir -p "${BASELINE_DIR}/android/light"
mkdir -p "${BASELINE_DIR}/android/dark"

# Check if Detox is configured
if [ ! -f ".detoxrc.js" ]; then
  echo -e "${RED}Error: .detoxrc.js not found. Please configure Detox first.${NC}"
  exit 1
fi

# List of all screens to capture (if not specified)
if [ -z "$SCREENS" ]; then
  SCREENS="feed,profile,courses,marketplace,certificates,messages,leaderboards,badges,settings,showcase"
fi

# Convert comma-separated screens to array
IFS=',' read -ra SCREEN_ARRAY <<< "$SCREENS"

capture_screenshots() {
  local platform=$1
  local color_mode=$2
  
  echo -e "${YELLOW}Capturing ${color_mode} mode screenshots for ${platform}...${NC}"
  
  for screen in "${SCREEN_ARRAY[@]}"; do
    echo -e "  📸 Capturing ${screen}..."
    
    # Run Detox test to capture screenshot
    # This assumes you have a visual-regression.test.js that navigates to each screen
    npx detox test \
      --configuration "${platform}.sim.debug" \
      --headless \
      --record-logs all \
      --take-screenshots all \
      --cleanup \
      e2e/visual-regression.test.js \
      --testNamePattern="^Baseline: ${screen} - ${color_mode}$" \
      2>&1 | grep -v "detox\[" || true
    
    # Move screenshot to baseline directory
    # Detox saves screenshots to artifacts directory
    if [ -f "artifacts/${screen}-${color_mode}.png" ]; then
      mv "artifacts/${screen}-${color_mode}.png" \
         "${BASELINE_DIR}/${platform}/${color_mode}/${screen}.png"
      echo -e "    ${GREEN}✓${NC} Saved to ${BASELINE_DIR}/${platform}/${color_mode}/${screen}.png"
    else
      echo -e "    ${RED}✗${NC} Screenshot not found for ${screen}"
    fi
  done
}

# Capture screenshots based on configuration
if [ "$DEVICE" = "ios" ] || [ "$DEVICE" = "both" ]; then
  if [ "$MODE" = "light" ] || [ "$MODE" = "both" ]; then
    capture_screenshots "ios" "light"
  fi
  
  if [ "$MODE" = "dark" ] || [ "$MODE" = "both" ]; then
    capture_screenshots "ios" "dark"
  fi
fi

if [ "$DEVICE" = "android" ] || [ "$DEVICE" = "both" ]; then
  if [ "$MODE" = "light" ] || [ "$MODE" = "both" ]; then
    capture_screenshots "android" "light"
  fi
  
  if [ "$MODE" = "dark" ] || [ "$MODE" = "both" ]; then
    capture_screenshots "android" "dark"
  fi
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Baseline capture complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "Baselines saved to: ${BASELINE_DIR}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review baselines: ls -lh ${BASELINE_DIR}/**/*.png"
echo -e "  2. Commit baselines: git add ${BASELINE_DIR} && git commit -m 'Add visual regression baselines'"
echo -e "  3. Run visual regression tests: npm run test:visual"
echo ""

# Summary
total_screenshots=$(find "${BASELINE_DIR}" -name "*.png" 2>/dev/null | wc -l)
echo -e "Total baseline screenshots: ${GREEN}${total_screenshots}${NC}"
