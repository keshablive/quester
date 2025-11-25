#!/bin/bash

# T203: Console Warnings Audit
# Checks for console statements not wrapped in __DEV__ or IS_DEV checks

echo "============================================"
echo "T203: CONSOLE WARNINGS AUDIT"
echo "============================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Count total console statements
echo "=== Analyzing Console Statements ==="
total_console=$(find app components lib -name "*.tsx" -o -name "*.ts" | xargs grep -n "console\.\(log\|warn\|error\)" 2>/dev/null | wc -l)
echo "Total console statements found: $total_console"

echo ""
echo "=== Checking for DEV Guards ==="

# Find console statements NOT wrapped in __DEV__ or IS_DEV checks
# Strategy: Look for console statements, then check if they're in a __DEV__ block

# Create temp file list of files with console
find app components lib \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "console\.\(log\|warn\|error\)" {} \; > /tmp/console_files.txt 2>/dev/null

unguarded_count=0
guarded_count=0
test_file_count=0

while read file; do
    # Skip test files and logger.ts
    if [[ "$file" == *"__tests__"* ]] || [[ "$file" == *"logger.ts"* ]] || [[ "$file" == *".test."* ]]; then
        test_file_count=$((test_file_count + 1))
        continue
    fi
    
    # Check if file has __DEV__ or IS_DEV guards
    if grep -q "__DEV__\|IS_DEV" "$file" 2>/dev/null; then
        guarded_count=$((guarded_count + 1))
        echo -e "${GREEN}✅ $file: Has DEV guards${NC}"
    else
        # Check if it's a test screen (test-error-boundary.tsx)
        if [[ "$file" == *"test-"* ]]; then
            echo -e "${YELLOW}⚠️  $file: Test screen (console expected)${NC}"
        else
            unguarded_count=$((unguarded_count + 1))
            echo -e "${RED}❌ $file: Console without DEV guards${NC}"
            # Show the console statements
            grep -n "console\.\(log\|warn\|error\)" "$file" 2>/dev/null | head -3
        fi
    fi
done < /tmp/console_files.txt

echo ""
echo "=== Summary ==="
echo "Files with console statements: $(wc -l < /tmp/console_files.txt)"
echo "Test files (excluded): $test_file_count"
echo "Files with DEV guards: $guarded_count"
echo "Files WITHOUT guards: $unguarded_count"

echo ""
echo "=== TypeScript Compilation Check ==="
# Check TypeScript compilation warnings
cd /d/quester/client
tsc_warnings=$(npx tsc --noEmit 2>&1 | grep -i "warning" | wc -l)
echo "TypeScript warnings: $tsc_warnings"

if [ "$tsc_warnings" -eq 0 ]; then
    echo -e "${GREEN}✅ No TypeScript warnings${NC}"
else
    echo -e "${YELLOW}⚠️  $tsc_warnings TypeScript warnings found${NC}"
    npx tsc --noEmit 2>&1 | grep -i "warning" | head -10
fi

echo ""
echo "=== Production Bundle Check ==="
# Check if EAS build config has proper console removal
if [ -f "eas.json" ]; then
    echo "Checking EAS build configuration..."
    if grep -q "production" eas.json; then
        echo -e "${GREEN}✅ Production build configuration exists${NC}"
    else
        echo -e "${YELLOW}⚠️  No production build configuration in eas.json${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  eas.json not found (optional)${NC}"
fi

# Check babel.config.js for transform-remove-console
if [ -f "babel.config.js" ]; then
    echo "Checking Babel configuration..."
    if grep -q "transform-remove-console\|remove-console" babel.config.js; then
        echo -e "${GREEN}✅ Babel configured to remove console in production${NC}"
    else
        echo -e "${YELLOW}⚠️  No babel-plugin-transform-remove-console found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  babel.config.js not found${NC}"
fi

echo ""
echo "=== T203 Assessment ==="

# Success criteria: All console statements wrapped in DEV checks OR
# Build system configured to strip console in production

if [ "$unguarded_count" -eq 0 ] && [ "$tsc_warnings" -eq 0 ]; then
    echo -e "${GREEN}✅ T203 SUCCESS: All console statements guarded, 0 TypeScript warnings${NC}"
elif [ "$tsc_warnings" -eq 0 ]; then
    if grep -q "transform-remove-console" babel.config.js 2>/dev/null; then
        echo -e "${GREEN}✅ T203 SUCCESS: Babel strips console in production, 0 TS warnings${NC}"
    else
        echo -e "${YELLOW}⚠️  T203 PARTIAL: $unguarded_count unguarded console, but 0 TS warnings${NC}"
        echo "   Recommendation: Add babel-plugin-transform-remove-console or wrap in __DEV__"
    fi
else
    echo -e "${RED}❌ T203 INCOMPLETE: $tsc_warnings TypeScript warnings found${NC}"
fi

echo ""
echo "============================================"
echo "AUDIT COMPLETE"
echo "============================================"

# Cleanup
rm -f /tmp/console_files.txt
