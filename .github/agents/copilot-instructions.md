# quester Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-23

## Active Technologies
- PostgreSQL with PostGIS extension, Redis for caching (001-server-refactor)
- Go 1.24.0 + Fiber v2 (web framework), GORM v1.30.0 (ORM), go-redis/v9 (cache), go-playground/validator/v10 (validation), google/uuid (identifiers) (002-server-refactor)
- PostgreSQL (primary), Redis (cache/session), S3 (file storage) (002-server-refactor)
- Go 1.25.0 + Fiber v2.52.9, GORM v1.30.0, go-redis v9.4.0, jwt-go v5.3.0 (003-framework-consolidation)
- PostgreSQL (via GORM), Redis (via go-redis) (003-framework-consolidation)
- Go 1.25.0 (Windows AMD64) + Fiber (web), GORM (ORM), go-playground/validator (validation), google/uuid (004-framework-reusability)
- PostgreSQL with PostGIS, Redis (caching) (004-framework-reusability)
- Go 1.24 (server), TypeScript 5.x (client) + Fiber v2, GORM, React Native/Expo, NativeWind (Tailwind CSS) (006-course-gamification)
- PostgreSQL (primary), Redis (caching, leaderboards, rate limiting) (006-course-gamification)
- Go 1.21+ + Fiber v2, GORM, go-redis v9, Prometheus client, klauspost/compress (007-api-performance-caching)
- PostgreSQL (primary), Redis (caching + rate limiting) (007-api-performance-caching)
- Go 1.24.0 + Fiber v2, GORM, go-redis v9, xxhash (for ETag generation) (008-api-response-optimization)
- PostgreSQL (via GORM), Redis (via 007 CacheService) (008-api-response-optimization)
- TypeScript 5.9, React 19.1, React Native 0.81.5 + @tanstack/react-query@^5, @tanstack/react-query-persist-client@^5, @tanstack/query-async-storage-persister@^5, @react-native-async-storage/async-storage@2.2 (012-client-data-fetching)
- AsyncStorage for cache persistence (24-hour retention) (012-client-data-fetching)
- Go 1.21+ + Fiber v2, GORM, Redis (go-redis/v9), DI container (internal/framework/container) (013-leaderboard-controller-integration)
- PostgreSQL (via GORM), Redis sorted sets (primary for real-time rankings) (013-leaderboard-controller-integration)
- TypeScript 5.9, React 19.1, React Native 0.81.5 + Expo 54, Expo Router 6, @tanstack/react-query 5.90, AsyncStorage, expo-local-authentication (new), expo-secure-store (new) (014-auth-api-integration)
- AsyncStorage for session, SecureStore for credentials (biometrics) (014-auth-api-integration)
- TypeScript 5.9, React Native 0.81.5, Go 1.24 + TanStack Query 5.90, Expo 54, Expo Router 6, NativeWind 4.2 (015-profile-api-integration)
- PostgreSQL (server), TanStack Query cache (client) (015-profile-api-integration)
- TypeScript 5.9, React Native 0.81.5 + TanStack Query 5.90, Expo 54, NativeWind 4.2 (016-analytics-api-integration)
- N/A (client-side, fetches from server API) (016-analytics-api-integration)
- TypeScript 5.9, Go 1.24 + TanStack Query 5.90, React Native 0.81.5, Expo 54, NativeWind 4.2 (017-messages-api-integration)
- PostgreSQL (server-side, existing), TanStack Query cache (client-side) (017-messages-api-integration)
- TypeScript 5.9, React 19.1.0, React Native 0.81.5 + Expo 54, TanStack Query 5.90, NativeWind 4.2, expo-router 6.0 (018-client-performance)
- AsyncStorage (TanStack Query persister) (018-client-performance)
- TypeScript 5.9, React 19.1.0, React Native 0.81.5 + Expo SDK 54, expo-router 6.0.10, TanStack Query 5.90, NativeWind 4.2 (019-client-image-list-performance)
- AsyncStorage (auth tokens), expo-secure-store (credentials), expo-image disk cache (019-client-image-list-performance)
- TypeScript 5.x with React Native (Expo 54) + @tanstack/react-query ^5.90.11, @tanstack/query-async-storage-persister ^5.90.13, @shopify/flash-list 2.0.2 (020-client-tanstack-query-migration)
- AsyncStorage for cache persistence (already configured) (020-client-tanstack-query-migration)
- TypeScript 5.x, React 19.1, React Native 0.81.5 + TanStack Query 5.90, Expo Router 6.x, NativeWind 4.2, @shopify/flash-list 2.0 (021-client-tanstack-completion)
- AsyncStorage (via @tanstack/query-async-storage-persister for cache persistence) (021-client-tanstack-completion)
- TypeScript 5.x + React 19.1, React Native 0.81.5, Expo 54, TanStack Query 5.90 (022-client-tanstack-phase2)
- AsyncStorage (offline persistence), REST API (022-client-tanstack-phase2)
- TypeScript 5.x, React Native with Expo + TanStack Query v5, NativeWind, React Native Reusables (@shadcn) (023-client-tanstack-phase3)
- AsyncStorage for query cache persistence (023-client-tanstack-phase3)

- Go 1.24.0 + Fiber v2 (HTTP framework), GORM v2 (ORM), PostgreSQL driver, UUID library, Redis client (001-server-refactor)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for Go 1.24.0

## Code Style

Go 1.24.0: Follow standard conventions

## Recent Changes
- 023-client-tanstack-phase3: Added TypeScript 5.x, React Native with Expo + TanStack Query v5, NativeWind, React Native Reusables (@shadcn)
- 022-client-tanstack-phase2: Added TypeScript 5.x + React 19.1, React Native 0.81.5, Expo 54, TanStack Query 5.90
- 021-client-tanstack-completion: Added TypeScript 5.x, React 19.1, React Native 0.81.5 + TanStack Query 5.90, Expo Router 6.x, NativeWind 4.2, @shopify/flash-list 2.0


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
