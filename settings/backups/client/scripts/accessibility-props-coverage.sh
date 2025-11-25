#!/bin/bash

# T202: Accessibility Props Coverage Audit
# Analyzes all interactive components for accessibility props

echo "============================================"
echo "T202: ACCESSIBILITY PROPS COVERAGE AUDIT"
echo "============================================"
echo ""

# Define colors (using ANSI codes that work in bash)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Count functions
count_rnr_buttons=0
count_rnr_buttons_with_label=0
count_pressables=0
count_pressables_with_props=0
count_touchable=0
count_touchable_with_props=0

# Analyze RNR Button components
echo "=== RNR Button Analysis ==="
find app -name "*.tsx" -type f | while read file; do
    # Count buttons in file
    button_count=$(grep -c "from 'react-native-reusables/button'" "$file" 2>/dev/null || echo 0)
    if [ "$button_count" -gt 0 ]; then
        # Check if file has accessibility labels
        label_count=$(grep -c "accessibilityLabel" "$file" 2>/dev/null || echo 0)
        echo "$file: $button_count Button imports, $label_count accessibilityLabel"
    fi
done

echo ""
echo "=== Pressable Component Analysis ==="
# Find files with Pressable
find app -name "*.tsx" -type f | while read file; do
    pressable_count=$(grep -c "<Pressable" "$file" 2>/dev/null || echo 0)
    if [ "$pressable_count" -gt 0 ]; then
        # Check for accessibility props
        role_count=$(grep -c "accessibilityRole" "$file" 2>/dev/null || echo 0)
        label_count=$(grep -c "accessibilityLabel" "$file" 2>/dev/null || echo 0)
        hint_count=$(grep -c "accessibilityHint" "$file" 2>/dev/null || echo 0)
        total_props=$((role_count + label_count + hint_count))
        
        if [ "$total_props" -gt 0 ]; then
            echo -e "${GREEN}✅ $file: $pressable_count Pressable, $total_props accessibility props${NC}"
        else
            echo -e "${RED}❌ $file: $pressable_count Pressable, 0 accessibility props${NC}"
        fi
    fi
done

echo ""
echo "=== TouchableOpacity/Highlight Analysis ==="
# Find files with TouchableOpacity/Highlight
find app -name "*.tsx" -type f | while read file; do
    touchable_count=$(grep -c "TouchableOpacity\|TouchableHighlight" "$file" 2>/dev/null || echo 0)
    if [ "$touchable_count" -gt 0 ]; then
        # Check for accessibility props
        role_count=$(grep -c "accessibilityRole" "$file" 2>/dev/null || echo 0)
        label_count=$(grep -c "accessibilityLabel" "$file" 2>/dev/null || echo 0)
        hint_count=$(grep -c "accessibilityHint" "$file" 2>/dev/null || echo 0)
        total_props=$((role_count + label_count + hint_count))
        
        if [ "$total_props" -gt 0 ]; then
            echo -e "${GREEN}✅ $file: $touchable_count Touchable*, $total_props accessibility props${NC}"
        else
            echo -e "${RED}❌ $file: $touchable_count Touchable*, 0 accessibility props${NC}"
        fi
    fi
done

echo ""
echo "=== Overall Statistics ==="

# Total counts
total_interactive=$(find app -name "*.tsx" -type f | xargs grep -h "<Button\|<Pressable\|<TouchableOpacity\|<TouchableHighlight" 2>/dev/null | wc -l)
total_with_role=$(find app -name "*.tsx" -type f | xargs grep -l "accessibilityRole" 2>/dev/null | wc -l)
total_with_label=$(find app -name "*.tsx" -type f | xargs grep -l "accessibilityLabel" 2>/dev/null | wc -l)
total_with_hint=$(find app -name "*.tsx" -type f | xargs grep -l "accessibilityHint" 2>/dev/null | wc -l)

# Count screens with accessibility
total_screens=$(find app -name "*.tsx" -type f | wc -l)
screens_with_props=$(find app -name "*.tsx" -type f | xargs grep -l "accessibilityLabel\|accessibilityRole\|accessibilityHint" 2>/dev/null | wc -l)

echo "Total interactive components: $total_interactive"
echo "Screens with accessibilityRole: $total_with_role"
echo "Screens with accessibilityLabel: $total_with_label"
echo "Screens with accessibilityHint: $total_with_hint"
echo ""
echo "Total screens: $total_screens"
echo "Screens with accessibility props: $screens_with_props"

# Calculate percentage
if [ "$total_screens" -gt 0 ]; then
    coverage=$(awk "BEGIN {printf \"%.1f\", ($screens_with_props / $total_screens) * 100}")
    echo -e "${BLUE}Accessibility Coverage: $coverage%${NC}"
    
    if [ "$coverage" -ge 95 ]; then
        echo -e "${GREEN}✅ TARGET MET: ≥95% coverage${NC}"
    else
        echo -e "${YELLOW}⚠️  TARGET NOT MET: Need 95%+ coverage (currently $coverage%)${NC}"
    fi
else
    echo "No screens found"
fi

echo ""
echo "=== RNR Button Coverage (Automatic A11y) ==="

# Count RNR Button usage
rnr_button_screens=$(find app -name "*.tsx" -type f | xargs grep -l "from 'react-native-reusables/button'" 2>/dev/null | wc -l)

echo "Screens using RNR Button: $rnr_button_screens"
echo "Note: RNR Button components have built-in accessibility (role='button', keyboard support)"

# Calculate percentage of screens using RNR Button
if [ "$total_screens" -gt 0 ]; then
    rnr_coverage=$(awk "BEGIN {printf \"%.1f\", ($rnr_button_screens / $total_screens) * 100}")
    echo -e "${BLUE}RNR Button Coverage: $rnr_coverage%${NC}"
fi

echo ""
echo "=== Detailed Component Breakdown ==="

# Count specific component types
button_count=$(find app -name "*.tsx" -type f | xargs grep -c "<Button" 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
pressable_count=$(find app -name "*.tsx" -type f | xargs grep -c "<Pressable" 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
touchable_count=$(find app -name "*.tsx" -type f | xargs grep -c "<TouchableOpacity\|<TouchableHighlight" 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')

echo "Total Button components: $button_count"
echo "Total Pressable components: $pressable_count"
echo "Total TouchableOpacity/Highlight: $touchable_count"

# RNR Button automatic accessibility
rnr_button_count=$(find app -name "*.tsx" -type f | xargs grep -c "from 'react-native-reusables/button'" 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
echo ""
echo "RNR Button imports (automatic a11y): $rnr_button_count"

# Calculate effective coverage (RNR Button + explicit props)
if [ "$total_interactive" -gt 0 ]; then
    # Assume RNR Button screens have full a11y + screens with explicit props
    effective_screens_covered=$((rnr_button_screens + screens_with_props - rnr_button_screens))  # Remove overlap
    effective_coverage=$(awk "BEGIN {printf \"%.1f\", ($effective_screens_covered / $total_screens) * 100}")
    
    echo ""
    echo "=== Effective Accessibility Coverage ==="
    echo "Screens with RNR Button (auto a11y): $rnr_button_screens"
    echo "Screens with explicit a11y props: $screens_with_props"
    echo "Total screens covered: $effective_screens_covered / $total_screens"
    echo -e "${BLUE}Effective Coverage: $effective_coverage%${NC}"
    
    if [ "$effective_coverage" -ge 95 ]; then
        echo -e "${GREEN}✅ T202 SUCCESS: ≥95% effective accessibility coverage${NC}"
    else
        echo -e "${YELLOW}⚠️  T202 INCOMPLETE: Need 95%+ (currently $effective_coverage%)${NC}"
    fi
fi

echo ""
echo "============================================"
echo "AUDIT COMPLETE"
echo "============================================"
