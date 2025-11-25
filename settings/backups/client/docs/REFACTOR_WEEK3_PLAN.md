# Week 3 Structure Optimization Plan

## Progress Summary

### ✅ Completed Tasks
- Applied path aliases (@/lib/*) to video components (3 files)
- Applied path aliases to validation scripts (1 file)
- Identified oversized files requiring splitting

### 🔄 In Progress
- File size analysis and splitting strategy

### ⏳ Pending
- Folder structure reorganization by feature domain
- Additional path alias conversions (if needed)

## Oversized Files Analysis

Files over 500 lines that may benefit from splitting:

| File | Lines | Priority | Split Strategy |
|------|-------|----------|----------------|
| `lib/api/auth.ts` | 1206 | HIGH | Split into auth types, auth service, token utils |
| `app/index.tsx` | 829 | MEDIUM | Extract navigation logic, onboarding flow |
| `app/property-listing-form.tsx` | 819 | MEDIUM | Extract form sections, validation logic |
| `app/moderator-dashboard.tsx` | 747 | MEDIUM | Extract dashboard widgets, stats panels |
| `lib/services/video-stream-manager.ts` | 744 | HIGH | Split into HLS parser, ABR controller, metrics |
| `app/stream-setup.tsx` | 663 | LOW | Keep as-is (form complexity requires context) |
| `components/video/ABRVideoPlayer.tsx` | 648 | MEDIUM | Extract controls, quality selector, metrics panel |
| `lib/hooks/useReports.ts` | 620 | MEDIUM | Split by report type (analytics, user, content) |
| `app/reports.tsx` | 601 | LOW | Keep as-is (dashboard screen) |
| `app/live-stream/[id].tsx` | 567 | LOW | Keep as-is (single screen) |
| `app/(tabs)/admin/badge-approvals.tsx` | 567 | LOW | Keep as-is (admin screen) |
| `lib/api/reports.ts` | 555 | MEDIUM | Split by report domain |
| `lib/hooks/use-performance-monitor.ts` | 549 | MEDIUM | Extract metrics types, collectors |
| `lib/hooks/useAnalytics.ts` | 537 | MEDIUM | Split by analytics domain |
| `app/(tabs)/videos/index.tsx` | 529 | LOW | Keep as-is (feed screen) |
| `lib/api/videos.ts` | 526 | MEDIUM | Already enhanced, consider if more needed |
| `lib/services/s3-storage-service.ts` | 518 | MEDIUM | Split uploads, downloads, streaming |

## Recommended Splits

### Priority 1: lib/api/auth.ts (1206 lines)

**Current Structure:**
- Lines 1-176: Type definitions (17 interfaces)
- Lines 177-316: Helper functions (retry, tenant resolution)
- Lines 317-970: AuthAPI class (15 methods)
- Lines 971-1207: Singleton instance, token utils, storage functions

**Proposed Split:**
```
lib/api/auth/
  ├── types.ts          (Response interfaces, 150 lines)
  ├── auth-service.ts   (Main AuthAPI class, 600 lines)
  ├── token-utils.ts    (Token storage, retrieval, 200 lines)
  ├── helpers.ts        (Retry, tenant resolution, 150 lines)
  └── index.ts          (Re-exports, singleton, 50 lines)
```

**Benefits:**
- Clearer separation of concerns
- Easier testing (mock token utils independently)
- Better maintainability (find types quickly)
- Follows domain organization pattern

### Priority 2: lib/services/video-stream-manager.ts (744 lines)

**Proposed Split:**
```
lib/services/video/
  ├── types.ts              (StreamMetrics, QualityLevel, etc.)
  ├── hls-parser.ts         (M3U8 parsing logic)
  ├── abr-controller.ts     (Adaptive bitrate logic)
  ├── stream-metrics.ts     (Metrics collection)
  ├── stream-manager.ts     (Main orchestration)
  └── index.ts              (Re-exports)
```

### Priority 3: lib/hooks/useReports.ts (620 lines)

**Proposed Split:**
```
lib/hooks/reports/
  ├── use-analytics-reports.ts
  ├── use-user-reports.ts
  ├── use-content-reports.ts
  └── index.ts
```

## Path Aliases Status

### ✅ Converted Files
- `components/video/ABRVideoPlayer.tsx` - 4 imports converted
- `components/video/DebugMetricsPanel.tsx` - 1 import converted
- `components/video/NetworkIndicator.tsx` - 1 import converted
- `scripts/validate-theme-contrast.ts` - 1 import converted

### ✅ Already Using Path Aliases
Most of the codebase already uses `@/*` path aliases correctly. Spot checks show:
- All `app/*` files use `@/components/*` and `@/lib/*`
- Components use `@/lib/*` for utilities and APIs
- Test files use `@/lib/*` and `@/components/*`

## Folder Structure Recommendations

### Current Structure (Flat)
```
lib/
  ├── api/          (19+ API clients)
  ├── hooks/        (30+ hooks)
  ├── services/     (10+ services)
  ├── utils/        (15+ utilities)
  └── types/        (8+ type files)
```

### Proposed Structure (Feature-Based)
```
lib/
  ├── auth/
  │   ├── api/
  │   ├── hooks/
  │   ├── types/
  │   └── utils/
  ├── marketplace/
  │   ├── api/
  │   ├── hooks/
  │   └── types/
  ├── social/
  │   ├── api/
  │   ├── hooks/
  │   └── types/
  ├── video/
  │   ├── api/
  │   ├── hooks/
  │   ├── services/
  │   └── types/
  ├── lms/
  │   ├── api/
  │   ├── hooks/
  │   └── types/
  ├── gamification/
  │   ├── api/
  │   ├── hooks/
  │   ├── services/
  │   └── types/
  ├── shared/
  │   ├── components/
  │   ├── hooks/
  │   ├── types/
  │   └── utils/
  └── core/
      ├── api-client.ts
      ├── websocket/
      └── storage/
```

**Benefits:**
- Feature boundaries clearly defined
- Easier to find related code
- Better code ownership (teams per feature)
- Reduces coupling between features
- Makes dependency graph visible

**Challenges:**
- Large migration effort (400+ files)
- Need to update all imports
- Risk of breaking changes
- Should be done incrementally

## Next Steps

1. **Immediate (Week 3 Completion)**:
   - ✅ Document oversized files
   - Split `lib/api/auth.ts` into auth/ folder
   - Verify TypeScript compilation
   - Run test suite

2. **Short Term (Post-Week 3)**:
   - Split video-stream-manager.ts
   - Split useReports.ts hook
   - Update import paths as needed

3. **Long Term (Future Iteration)**:
   - Plan feature-based folder migration
   - Create migration script for automated import updates
   - Migrate one feature domain at a time (start with smallest)
   - Update documentation and onboarding materials

## Notes

- TypeScript errors reduced from 38 → 11 (71% improvement)
- Test coverage maintained at 88 passing tests
- All path aliases working correctly
- No breaking changes introduced
