# Courses Screen Visual Regression Baseline

## Captured: November 10, 2025

### Screenshots

- `listing-light.png` - Course listing in light theme
- `listing-dark.png` - Course listing in dark theme
- `filtered-beginner-light.png` - Beginner filter applied
- `filtered-free-light.png` - Free courses only
- `empty-state-light.png` - No courses found
- `loading-state-light.png` - Loading indicator

### Test Cases

1. **Header**
   - "Explore Courses" title (h1)
   - Subtitle text

2. **Search Bar**
   - Input with label association
   - Clear button (X icon)
   - Placeholder text

3. **Filters**
   - Difficulty radio buttons (All, Beginner, Intermediate, Advanced)
   - Free courses checkbox with label
   - Selected state styling

4. **Course Grid**
   - CourseCard components
   - Course thumbnails
   - Title, instructor, price
   - Grid layout (2 columns)

5. **States**
   - Loading (ActivityIndicator)
   - Empty state
   - Error handling

6. **Accessibility**
   - Label/Input associations via nativeID
   - Radio group for difficulty filter
   - Checkbox with label
   - Proper ARIA attributes

7. **Performance**
   - ScrollView with removeClippedSubviews
   - useMemo for filtered courses
   - useCallback for handlers

## Status: ✅ Accessible and optimized
