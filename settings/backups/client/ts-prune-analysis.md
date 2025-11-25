# ts-prune Analysis Report
# Generated: $(date)
# Total Unused Exports: 903

## Summary

This report documents the unused exports identified by ts-prune in the client codebase.
Many of these are intentional public APIs exported for future use or external consumption.

## Categories of Unused Exports

### 1. Public API Exports (Intentional)
- **Type definitions** marked as "(used in module)" - These are exported types/interfaces
- **API client functions** - Exported for consumption but not yet used internally
- **Utility functions** - Part of public API surface

### 2. Hooks (Potential Cleanup Candidates)
- Many custom hooks may not be fully utilized
- Need to verify if they're used in app components

### 3. Components (Check App Usage)
- Default exports from app/(tabs) directories
- May be route components used by Expo Router

### 4. Library Utilities (Review Needed)
- Analytics utilities
- Workflow helpers
- Performance monitoring functions

## Recommended Actions

### Phase 1: Verify Route Components
- Check that app/(tabs) default exports are actually used by Expo Router
- These may be false positives

### Phase 2: Review Public APIs
- Identify which exports are part of the public API surface
- Document intentional exports in README or API docs

### Phase 3: Safe Removals
- Remove truly unused internal utilities
- Remove deprecated code marked with @deprecated

### Phase 4: Type Exports
- Keep type exports even if marked as unused
- These are often used for external consumers

## Files with Most Unused Exports

### lib/types/index.ts
- Many type definitions exported
- These are likely intentional for type safety

### lib/hooks/* 
- Various custom hooks
- Need to check app component usage

### lib/utils/*
- Utility functions
- Many may be part of public API

## Notes

- ts-prune reports "(used in module)" for type-only imports
- Default exports from route files may be false positives
- Public API exports should be intentional even if unused internally

## Next Steps

1. Create whitelist of intentional public API exports
2. Document public API in AGENT_CLIENT_HELPER.md
3. Remove deprecated functions
4. Remove truly unused internal utilities
5. Re-run ts-prune after cleanup
