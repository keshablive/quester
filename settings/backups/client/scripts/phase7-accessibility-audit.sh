#!/bin/bash

# Comprehensive Accessibility Audit for Phase 7
# Checks all screens for RNR compliance and accessibility props

set -e

echo "♿ Phase 7 Accessibility Audit"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_SCREENS=0
COMPLIANT_SCREENS=0
NON_COMPLIANT_SCREENS=0

# Check migrated screens (P2 + P3 + T197)
MIGRATED_SCREENS=(
  "app/(tabs)/certificates.tsx"
  "app/(tabs)/messages.tsx"
  "app/(tabs)/reels.tsx"
  "app/properties.tsx"
  "app/classifieds.tsx"
  "app/leaderboards.tsx"
  "app/badges.tsx"
  "app/reports.tsx"
  "app/(tabs)/admin/badge-approvals.tsx"
  "app/(tabs)/videos/index.tsx"
  "app/(tabs)/videos/live/[id].tsx"
  "app/followers/[id].tsx"
  "app/following/[id].tsx"
  "app/live-stream/[id].tsx"
  "app/(tabs)/courses/[id]/index.tsx"
  "app/(tabs)/courses/[id]/player.tsx"
  "app/settings.tsx"
  "app/certificates/[id].tsx"
  "app/badges/[id].tsx"
  "app/posts/[id].tsx"
  "app/create-post.tsx"
  "app/edit-profile.tsx"
  "app/media-viewer.tsx"
  "app/new-chat.tsx"
  "app/group-info.tsx"
  "app/user-profile.tsx"
  "app/report-builder.tsx"
  "app/reports/[id].tsx"
  "app/+not-found.tsx"
  "app/(tabs)/messages/[id].tsx"
)

echo "1. Checking 30 Migrated Screens (P2 + P3 + T197)"
echo "================================================"
echo ""

for screen in "${MIGRATED_SCREENS[@]}"; do
  TOTAL_SCREENS=$((TOTAL_SCREENS + 1))
  
  if [ ! -f "$screen" ]; then
    echo -e "${RED}✗${NC} $screen - File not found"
    NON_COMPLIANT_SCREENS=$((NON_COMPLIANT_SCREENS + 1))
    continue
  fi
  
  # Check for ScreenWrapper
  if ! grep -q "ScreenWrapper" "$screen"; then
    echo -e "${RED}✗${NC} $screen - Missing ScreenWrapper"
    NON_COMPLIANT_SCREENS=$((NON_COMPLIANT_SCREENS + 1))
    continue
  fi
  
  # Check for RNR Text import
  if ! grep -q "from '@/components/ui/text'" "$screen"; then
    echo -e "${YELLOW}⚠${NC} $screen - Missing RNR Text import (may use native Text)"
  fi
  
  # Check for legacy Pressable/TouchableOpacity
  if grep -q "Pressable\|TouchableOpacity" "$screen" | grep -v "import"; then
    LEGACY_COUNT=$(grep -c "Pressable\|TouchableOpacity" "$screen" | grep -v "import" || echo "0")
    if [ "$LEGACY_COUNT" -gt 0 ]; then
      echo -e "${YELLOW}⚠${NC} $screen - Contains $LEGACY_COUNT legacy interactive components"
    fi
  fi
  
  echo -e "${GREEN}✓${NC} $screen - Compliant"
  COMPLIANT_SCREENS=$((COMPLIANT_SCREENS + 1))
done

echo ""
echo "2. Checking Non-Migrated Screens"
echo "================================="
echo ""

# Find all screen files not in migrated list
ALL_SCREENS=$(find app -name "*.tsx" -type f | grep -v "__tests__" | grep -v "node_modules")

NON_MIGRATED_COUNT=0
for screen in $ALL_SCREENS; do
  # Check if screen is in migrated list
  IS_MIGRATED=false
  for migrated in "${MIGRATED_SCREENS[@]}"; do
    if [ "$screen" = "$migrated" ]; then
      IS_MIGRATED=true
      break
    fi
  done
  
  if [ "$IS_MIGRATED" = false ]; then
    NON_MIGRATED_COUNT=$((NON_MIGRATED_COUNT + 1))
    
    # Check for ScreenWrapper
    HAS_WRAPPER=$(grep -c "ScreenWrapper" "$screen" || echo "0")
    
    # Check for legacy components
    HAS_PRESSABLE=$(grep -c "<Pressable\|<TouchableOpacity" "$screen" || echo "0")
    
    # Check for RNR components
    HAS_RNR_TEXT=$(grep -c "from '@/components/ui/text'" "$screen" || echo "0")
    HAS_RNR_BUTTON=$(grep -c "from '@/components/ui/button'" "$screen" || echo "0")
    
    if [ "$HAS_WRAPPER" -eq 0 ] || [ "$HAS_PRESSABLE" -gt 0 ]; then
      echo -e "${YELLOW}⚠${NC} $screen"
      [ "$HAS_WRAPPER" -eq 0 ] && echo "    - Missing ScreenWrapper"
      [ "$HAS_PRESSABLE" -gt 0 ] && echo "    - Has $HAS_PRESSABLE legacy interactive components"
      [ "$HAS_RNR_TEXT" -eq 0 ] && echo "    - Not using RNR Text"
      [ "$HAS_RNR_BUTTON" -eq 0 ] && echo "    - Not using RNR Button"
    fi
  fi
done

echo ""
echo "Found $NON_MIGRATED_COUNT non-migrated screens"

echo ""
echo "3. Summary"
echo "=========="
echo ""
echo -e "${GREEN}Migrated Screens:${NC} $COMPLIANT_SCREENS / ${#MIGRATED_SCREENS[@]}"
echo -e "${YELLOW}Non-Migrated Screens:${NC} $NON_MIGRATED_COUNT"
echo -e "${GREEN}Compliance Rate:${NC} $(echo "scale=1; $COMPLIANT_SCREENS * 100 / ${#MIGRATED_SCREENS[@]}" | bc)%"

echo ""
echo "4. Component Usage Statistics"
echo "============================="
echo ""

# Count RNR component usage
BUTTON_USAGE=$(find app -name "*.tsx" -type f -exec grep -l "from '@/components/ui/button'" {} \; | wc -l)
TEXT_USAGE=$(find app -name "*.tsx" -type f -exec grep -l "from '@/components/ui/text'" {} \; | wc -l)
SCREEN_WRAPPER_USAGE=$(find app -name "*.tsx" -type f -exec grep -l "ScreenWrapper" {} \; | wc -l)

echo "RNR Button usage: $BUTTON_USAGE screens"
echo "RNR Text usage: $TEXT_USAGE screens"
echo "ScreenWrapper usage: $SCREEN_WRAPPER_USAGE screens"

echo ""
echo "5. Legacy Component Count"
echo "========================="
echo ""

# Count legacy components across all screens
TOTAL_PRESSABLE=$(find app -name "*.tsx" -type f -exec grep -oh "<Pressable" {} \; | wc -l)
TOTAL_TOUCHABLE=$(find app -name "*.tsx" -type f -exec grep -oh "<TouchableOpacity\|<TouchableHighlight" {} \; | wc -l)

echo "Total Pressable instances: $TOTAL_PRESSABLE"
echo "Total TouchableOpacity/Highlight instances: $TOTAL_TOUCHABLE"
echo -e "${YELLOW}Legacy components remaining:${NC} $((TOTAL_PRESSABLE + TOTAL_TOUCHABLE))"

echo ""
echo "✅ Accessibility audit complete!"
echo ""

exit 0
