# Profile Screen Visual Regression Baseline

## Captured: November 10, 2025

### Screenshots

- `light-mode.png` - Profile screen in light theme
- `dark-mode.png` - Profile screen in dark theme

### Test Cases

1. **User Info Card**
   - Avatar display
   - Username and email
   - Level, XP, Badges stats

2. **Badges Showcase**
   - Badge grid layout (3 columns)
   - Empty state ("No badges yet")
   - Loading state
   - "View All" button

3. **Accessibility Features**
   - All interactive elements have roles
   - Screen reader announcements
   - Pull-to-refresh label

### How to Capture

```bash
cd client
npm run visual:baseline profile
```

### How to Test

```bash
cd client
npm run visual:test profile
```

## Status: ✅ Ready for migration testing
