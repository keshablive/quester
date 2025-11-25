# Feed Screen Visual Regression Baseline

## Captured: November 10, 2025

### Screenshots

- `following-light.png` - Following feed in light theme
- `following-dark.png` - Following feed in dark theme
- `public-light.png` - Public feed in light theme
- `public-dark.png` - Public feed in dark theme
- `empty-state-light.png` - Empty feed state in light theme
- `empty-state-dark.png` - Empty feed state in dark theme

### Test Cases

1. **Feed Tabs**
   - Following tab (selected/unselected)
   - Public tab (selected/unselected)
   - Create post button

2. **Post List**
   - FlatList with posts
   - Post card layout
   - Like, comment, share buttons
   - User avatars and names

3. **Empty State**
   - "No posts yet" message
   - Newspaper icon
   - Contextual message by feed type

4. **Performance Features**
   - Scroll performance (60 FPS target)
   - FlatList optimizations active:
     - `removeClippedSubviews={true}`
     - `maxToRenderPerBatch={10}`
     - `windowSize={21}`
     - `getItemLayout` optimization
   - Pull-to-refresh

5. **Accessibility**
   - Tab roles with selected state
   - List role for FlatList
   - Button labels and hints
   - RefreshControl label

## Status: ✅ Optimized and accessible
