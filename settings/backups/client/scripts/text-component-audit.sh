#!/bin/bash

# T206: Text Component Usage Audit
# Verifies all 30 Phase 7 screens use RNR Text instead of native Text

echo "============================================"
echo "T206: TEXT COMPONENT USAGE AUDIT"
echo "============================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Phase 7 screens to audit
P2_SCREENS=(
  "app/(tabs)/certificates.tsx"
  "app/(tabs)/messages.tsx"
  "app/(tabs)/reels.tsx"
  "app/properties.tsx"
  "app/classifieds.tsx"
  "app/leaderboards.tsx"
  "app/badges.tsx"
)

P3_SCREENS=(
  "app/reports.tsx"
  "app/(tabs)/admin/badge-approvals.tsx"
  "app/(tabs)/videos/index.tsx"
  "app/(tabs)/videos/live/[id].tsx"
  "app/followers/[id].tsx"
  "app/following/[id].tsx"
  "app/live-stream/[id].tsx"
)

T197_SCREENS=(
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

compliant_count=0
non_compliant_count=0
missing_count=0

echo "=== P2 Screens (7 screens) ==="
for screen in "${P2_SCREENS[@]}"; do
    if [ ! -f "$screen" ]; then
        echo -e "${YELLOW}⚠️  $screen: File not found${NC}"
        missing_count=$((missing_count + 1))
        continue
    fi
    
    # Check for RNR Text import
    rnr_text=$(grep -c "@/components/ui/text" "$screen" 2>/dev/null || echo 0)
    # Check for native Text import
    native_text=$(grep -c "Text.*from ['\"]react-native['\"]" "$screen" 2>/dev/null || echo 0)
    
    if [ "$rnr_text" -gt 0 ] && [ "$native_text" -eq 0 ]; then
        echo -e "${GREEN}✅ $screen: Using RNR Text${NC}"
        compliant_count=$((compliant_count + 1))
    elif [ "$native_text" -gt 0 ]; then
        echo -e "${RED}❌ $screen: Using native Text${NC}"
        non_compliant_count=$((non_compliant_count + 1))
    else
        echo -e "${YELLOW}⚠️  $screen: No Text component found${NC}"
        missing_count=$((missing_count + 1))
    fi
done

echo ""
echo "=== P3 Screens (7 screens) ==="
for screen in "${P3_SCREENS[@]}"; do
    if [ ! -f "$screen" ]; then
        echo -e "${YELLOW}⚠️  $screen: File not found${NC}"
        missing_count=$((missing_count + 1))
        continue
    fi
    
    rnr_text=$(grep -c "@/components/ui/text" "$screen" 2>/dev/null || echo 0)
    native_text=$(grep -c "Text.*from ['\"]react-native['\"]" "$screen" 2>/dev/null || echo 0)
    
    if [ "$rnr_text" -gt 0 ] && [ "$native_text" -eq 0 ]; then
        echo -e "${GREEN}✅ $screen: Using RNR Text${NC}"
        compliant_count=$((compliant_count + 1))
    elif [ "$native_text" -gt 0 ]; then
        echo -e "${RED}❌ $screen: Using native Text${NC}"
        non_compliant_count=$((non_compliant_count + 1))
    else
        echo -e "${YELLOW}⚠️  $screen: No Text component found${NC}"
        missing_count=$((missing_count + 1))
    fi
done

echo ""
echo "=== T197 Screens (16 screens) ==="
for screen in "${T197_SCREENS[@]}"; do
    if [ ! -f "$screen" ]; then
        echo -e "${YELLOW}⚠️  $screen: File not found${NC}"
        missing_count=$((missing_count + 1))
        continue
    fi
    
    rnr_text=$(grep -c "@/components/ui/text" "$screen" 2>/dev/null || echo 0)
    native_text=$(grep -c "Text.*from ['\"]react-native['\"]" "$screen" 2>/dev/null || echo 0)
    
    if [ "$rnr_text" -gt 0 ] && [ "$native_text" -eq 0 ]; then
        echo -e "${GREEN}✅ $screen: Using RNR Text${NC}"
        compliant_count=$((compliant_count + 1))
    elif [ "$native_text" -gt 0 ]; then
        echo -e "${RED}❌ $screen: Using native Text${NC}"
        non_compliant_count=$((non_compliant_count + 1))
    else
        echo -e "${YELLOW}⚠️  $screen: No Text component found${NC}"
        missing_count=$((missing_count + 1))
    fi
done

echo ""
echo "=== Summary ==="
total_screens=30
echo "Total Phase 7 screens: $total_screens"
echo "Compliant (RNR Text): $compliant_count"
echo "Non-compliant (native Text): $non_compliant_count"
echo "No Text component: $missing_count"

if [ "$compliant_count" -eq "$total_screens" ]; then
    echo -e "${GREEN}✅ T206 SUCCESS: 100% Text component compliance${NC}"
elif [ "$non_compliant_count" -eq 0 ]; then
    echo -e "${GREEN}✅ T206 SUCCESS: No native Text usage (some screens have no text)${NC}"
else
    echo -e "${RED}❌ T206 INCOMPLETE: $non_compliant_count screens using native Text${NC}"
fi

# Calculate percentage
if [ "$total_screens" -gt 0 ]; then
    compliance_pct=$(awk "BEGIN {printf \"%.1f\", ($compliant_count / $total_screens) * 100}")
    echo "Compliance percentage: $compliance_pct%"
fi

echo ""
echo "============================================"
echo "AUDIT COMPLETE"
echo "============================================"
