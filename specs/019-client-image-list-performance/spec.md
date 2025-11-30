# Feature Specification: Client Image & List Performance Optimization

**Feature Branch**: `019-client-image-list-performance`  
**Created**: November 29, 2025  
**Status**: Draft  
**Input**: User description: "Optimize client-side image handling and list rendering with expo-image for caching, FlashList for high-performance virtualized lists, route-based code splitting for admin/analytics/reports screens, and AuthContext decomposition to reduce unnecessary re-renders"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Image Loading Experience (Priority: P1)

As a user browsing the app, I want images to load instantly when I revisit screens so that I don't wait for content to appear and the app feels responsive.

**Why this priority**: Images are displayed throughout the app (avatars, course thumbnails, quest banners, achievement badges). Without caching, every screen visit re-downloads images, causing visible loading delays and increased data usage. This is the most impactful change for perceived performance.

**Independent Test**: Can be fully tested by navigating to any screen with images (quests, courses, profiles), then navigating away and back—images should appear instantly without loading placeholders.

**Acceptance Scenarios**:

1. **Given** a user has previously viewed a quest card with an image, **When** they navigate away and return to the quests screen, **Then** the image displays immediately without a loading state
2. **Given** a user is on a slow network connection, **When** they view a screen with images, **Then** they see a smooth placeholder/blur transition until the image loads
3. **Given** a user views their profile avatar in multiple places (header, profile page, comments), **When** loading these screens, **Then** the avatar loads once and displays instantly everywhere else
4. **Given** the device has limited storage, **When** the image cache grows beyond a reasonable size, **Then** older cached images are automatically evicted without user intervention

---

### User Story 2 - Smooth Scrolling Through Long Lists (Priority: P1)

As a user scrolling through lists of quests, courses, messages, or social posts, I want smooth 60fps scrolling without jank or freezing so that the app feels native and responsive.

**Why this priority**: Several screens display large lists (quests, courses, messages, notifications, social feed). Current implementation may drop frames during rapid scrolling, causing a poor user experience. FlashList provides up to 10x better performance for large lists.

**Independent Test**: Can be fully tested by rapidly scrolling through any list with 50+ items while monitoring for visual stuttering or frame drops.

**Acceptance Scenarios**:

1. **Given** a user is viewing a list with 100+ items (quests, messages, notifications), **When** they scroll rapidly up and down, **Then** scrolling remains smooth without visible frame drops
2. **Given** a user scrolls through a list with complex items (cards with images, multiple text elements), **When** new items appear, **Then** they render without causing scroll jank
3. **Given** a user scrolls to the end of a long list, **When** more items are loaded (pagination), **Then** the scroll position is maintained and new items appear smoothly
4. **Given** a user is on a lower-end device, **When** they scroll through lists, **Then** performance remains acceptable (no freezing or ANR)

---

### User Story 3 - Fast App Launch and Navigation (Priority: P2)

As a user opening the app or navigating to different sections, I want screens to load quickly so that I can access features without waiting for large bundles to download.

**Why this priority**: Admin, Analytics, and Reports screens contain complex features that most users rarely access. Loading these upfront increases initial bundle size and slows app launch. Code splitting ensures only needed code is loaded.

**Independent Test**: Can be fully tested by measuring initial app launch time and comparing navigation time to admin vs. regular screens.

**Acceptance Scenarios**:

1. **Given** a regular user launches the app, **When** the app starts, **Then** the initial load completes without waiting for admin/analytics code to download
2. **Given** an admin user navigates to the admin dashboard, **When** the screen loads, **Then** it loads within acceptable time with a loading indicator if needed
3. **Given** a user navigates between regular screens (quests, profile, settings), **When** switching screens, **Then** navigation is instant without bundle loading delays
4. **Given** code splitting is implemented, **When** measuring the main bundle size, **Then** it is measurably smaller than before

---

### User Story 4 - Responsive Authentication State (Priority: P2)

As a user interacting with the app, I want authentication-related updates (login state, 2FA status, biometric settings) to only re-render relevant parts of the UI so that the app remains responsive during auth operations.

**Why this priority**: The current AuthContext bundles authentication state, 2FA state, and biometric settings together. Any change to one causes unnecessary re-renders across the entire app. Splitting this context reduces wasted render cycles and improves responsiveness.

**Independent Test**: Can be fully tested by enabling/disabling 2FA or biometric settings and verifying that only relevant UI components update.

**Acceptance Scenarios**:

1. **Given** a user changes their 2FA settings, **When** the change is saved, **Then** only 2FA-related UI components re-render, not the entire app
2. **Given** a user enables biometric authentication, **When** the setting is toggled, **Then** only biometric-related components update
3. **Given** a user's session token refreshes in the background, **When** the token updates, **Then** no visible UI re-renders occur for unrelated components
4. **Given** multiple components consume auth state, **When** auth state changes, **Then** components that don't depend on the changed value do not re-render

---

### Edge Cases

- What happens when an image URL is invalid or returns a 404? → Display a fallback placeholder image
- How does the system handle image loading on extremely slow networks (2G)? → Show progressive loading with blur-up effect
- What happens when a list is empty? → Display an appropriate empty state message
- How does the system behave when memory is constrained? → Image cache automatically reduces size; list virtualization prevents memory bloat
- What happens during code-split chunk loading failure? → Retry with exponential backoff; show error boundary with retry option
- How does AuthContext split affect existing components? → Graceful migration with backward-compatible wrapper if needed

## Requirements *(mandatory)*

### Functional Requirements

#### Image Handling

- **FR-001**: System MUST cache downloaded images locally for offline/instant access
- **FR-002**: System MUST display placeholder content during image loading (blur, skeleton, or branded placeholder)
- **FR-003**: System MUST support progressive image loading with smooth transitions
- **FR-004**: System MUST automatically evict cached images using LRU policy when cache exceeds 100MB
- **FR-005**: System MUST display fallback images when original images fail to load
- **FR-006**: System MUST support multiple image formats (JPEG, PNG, WebP, GIF)

#### List Rendering

- **FR-007**: System MUST efficiently virtualize long lists to minimize memory usage
- **FR-008**: System MUST maintain scroll position during data updates and pagination
- **FR-009**: System MUST recycle list item views for optimal performance
- **FR-010**: System MUST support pull-to-refresh on applicable lists
- **FR-011**: System MUST support infinite scroll/pagination for data-heavy lists
- **FR-012**: System MUST provide appropriate empty, loading, and error states for lists

#### Code Splitting

- **FR-013**: System MUST load admin-only screens on-demand (not in main bundle)
- **FR-014**: System MUST load analytics screens on-demand
- **FR-015**: System MUST load reports screens on-demand
- **FR-016**: System MUST display loading indicators during chunk loading
- **FR-017**: System MUST handle chunk loading failures gracefully with retry capability

#### State Management

- **FR-018**: System MUST separate core authentication state from 2FA state
- **FR-019**: System MUST separate biometric authentication state from core auth state
- **FR-020**: System MUST allow components to subscribe to only the auth state they need
- **FR-021**: System MUST maintain backward compatibility during context migration

### Key Entities

- **CachedImage**: Represents a locally cached image with metadata (URL, cache key, size, last accessed timestamp, expiration)
- **VirtualizedList**: Configuration for list virtualization (estimated item size, overscan count, key extractor)
- **LazyRoute**: Represents a code-split route with loading/error states and retry logic
- **AuthState**: Core authentication data (user, token, session status)
- **TwoFactorState**: 2FA-specific data (enabled status, verification pending, backup codes status)
- **BiometricState**: Biometric authentication data (enabled status, supported types, last verified)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Previously viewed images display within 100ms on revisit (vs current 1-3 seconds for re-download)
- **SC-002**: List scrolling maintains 60fps on mid-range devices during rapid scroll
- **SC-003**: Initial app bundle size is reduced by at least 15% after code splitting
- **SC-004**: Navigation to code-split screens (admin, analytics, reports) completes within 2 seconds on average connection
- **SC-005**: Components consuming only auth state do not re-render when 2FA/biometric state changes (verified via React DevTools profiler)
- **SC-006**: Memory usage during list scrolling remains stable (no continuous growth pattern)
- **SC-007**: Image cache hit rate exceeds 80% for returning users
- **SC-008**: 95% of list scroll interactions complete without dropped frames
- **SC-009**: Image cache size is limited to 100MB with automatic LRU eviction when threshold is reached

## Clarifications

### Session 2025-11-29

- Q: What should be the maximum image cache size before automatic eviction begins? → A: 100MB (balanced, good cache hit rate without excessive storage)

## Assumptions

- The app runs on Expo SDK 54+ which supports both expo-image and FlashList
- React Navigation is used for routing (code splitting via React.lazy compatible)
- The existing AuthContext can be refactored without breaking authentication flows
- Users have typical mobile data speeds (3G+) for initial image downloads
- Device storage allows for reasonable image cache sizes (50-100MB)
- Mid-range devices (2020+) are the target baseline for performance
