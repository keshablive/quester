# Tasks: Server Framework Consolidation

**Input**: Design documents from `/specs/026-server-framework-consolidation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested in specification - this is a refactoring task with build/test verification only.

**Organization**: Tasks organized by user story priority (P1 → P2 → P3) per spec.md.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US7)
- Include exact file paths in descriptions

## Path Conventions

- **Server code**: `server/internal/`
- **Framework target**: `server/internal/framework/`
- **Module path**: `github.com/keshablive/quester`

---

## Phase 1: Setup (Rollback Infrastructure)

**Purpose**: Create rollback points and verify baseline state

- [X] T001 Create git tag `pre-consolidation` for full rollback capability
- [X] T002 Run `go build ./...` in `server/` and document current errors (expected: duplicate declarations)
- [X] T003 Record baseline build time for SC-009 comparison (baseline: ~2.5s)

---

## Phase 2: Foundational - Fix Duplicate Declarations (US1 + US7 Prerequisites)

**Purpose**: Resolve P1 blocking issues before any file moves

**⚠️ CRITICAL**: Server cannot build until this phase is complete

- [X] T004 Create git tag `pre-phase-2` for phase rollback
- [X] T005 [US1] Create `server/internal/services/auth_types.go` with extracted shared types:
  - `SignupRequest` struct
  - `LoginRequest` struct  
  - `RefreshResponse` struct
  - `UserRepository` interface
  - `RefreshTokenRepository` interface
- [X] T006 [US1] Remove duplicate `LoginRequest` and interfaces from `server/internal/services/login_service.go`
- [X] T007 [US1] Remove duplicate `SignupRequest` from `server/internal/services/signup_service.go`
- [X] T008 [US1] Remove duplicate `RefreshResponse` from `server/internal/services/refresh_token_service.go`
- [X] T009 [US1] Remove duplicate declarations from `server/internal/services/auth_service.go` (keep imports to auth_types.go)
- [X] T010 [US1] [US7] Run `go build ./internal/services/...` in `server/` - verify zero errors (NOTE: controllers have separate duplicates to fix in Phase 5)
- [X] T011 Create git tag `post-phase-2-duplicates-fixed`

**Checkpoint**: Services package builds successfully. Phase 3+ can proceed.

---

## Phase 3: User Story 2 - Consolidate Services (Priority: P2)

**Goal**: All 60 services organized in `internal/framework/service/`

**Independent Test**: `go build ./...` passes; all services importable from `internal/framework/service`

- [X] T012 Create git tag `pre-phase-3`
- [X] T013 [P] [US2] Move `server/internal/services/achievement_service.go` → `server/internal/framework/service/`
- [X] T014 [P] [US2] Move `server/internal/services/analytics_service.go` → `server/internal/framework/service/`
- [X] T015 [P] [US2] Move `server/internal/services/assessment_service.go` → `server/internal/framework/service/`
- [X] T016 [P] [US2] Move `server/internal/services/audit_log_service.go` → `server/internal/framework/service/`
- [X] T017 [P] [US2] Move `server/internal/services/auth_service.go` → `server/internal/framework/service/`
- [X] T018 [P] [US2] Move `server/internal/services/auth_types.go` → `server/internal/framework/service/`
- [X] T019 [P] [US2] Move `server/internal/services/badge_service.go` → `server/internal/framework/service/`
- [X] T020 [P] [US2] Move `server/internal/services/bandwidth_estimator.go` → `server/internal/framework/service/`
- [X] T021 [P] [US2] Move `server/internal/services/blacklist_service.go` → `server/internal/framework/service/`
- [X] T022 [P] [US2] Move `server/internal/services/cache_service.go` → `server/internal/framework/service/`
- [X] T023 [P] [US2] Move `server/internal/services/certificate_generator.go` → `server/internal/framework/service/`
- [X] T024 [P] [US2] Move `server/internal/services/certificate_service.go` → `server/internal/framework/service/`
- [X] T025 [P] [US2] Move `server/internal/services/classified_ad_service.go` → `server/internal/framework/service/`
- [X] T026 [P] [US2] Move `server/internal/services/course_service.go` → `server/internal/framework/service/`
- [X] T027 [P] [US2] Move `server/internal/services/cron_service.go` → `server/internal/framework/service/`
- [X] T028 [P] [US2] Move `server/internal/services/dashboard_service.go` → `server/internal/framework/service/`
- [X] T029 [P] [US2] Move `server/internal/services/dvr_service.go` → `server/internal/framework/service/`
- [X] T030 [P] [US2] Move `server/internal/services/enrollment_service.go` → `server/internal/framework/service/`
- [X] T031 [P] [US2] Move `server/internal/services/fcm_service.go` → `server/internal/framework/service/`
- [X] T032 [P] [US2] Move `server/internal/services/ffmpeg_service.go` → `server/internal/framework/service/`
- [X] T033 [P] [US2] Move `server/internal/services/follow_service.go` → `server/internal/framework/service/`
- [X] T034 [P] [US2] Move `server/internal/services/gamification_service.go` → `server/internal/framework/service/`
- [X] T035 [P] [US2] Move `server/internal/services/interaction_service.go` → `server/internal/framework/service/`
- [X] T036 [P] [US2] Move `server/internal/services/jwt_service.go` → `server/internal/framework/service/`
- [X] T037 [P] [US2] Move `server/internal/services/kms_client.go` → `server/internal/framework/service/`
- [X] T038 [P] [US2] Move `server/internal/services/kms_service.go` → `server/internal/framework/service/`
- [X] T039 [P] [US2] Move `server/internal/services/leaderboard_service.go` → `server/internal/framework/service/`
- [X] T040 [P] [US2] Move `server/internal/services/learning_gamification_service.go` → `server/internal/framework/service/`
- [X] T041 [P] [US2] Move `server/internal/services/lesson_service.go` → `server/internal/framework/service/`
- [X] T042 [P] [US2] Move `server/internal/services/login_service.go` → `server/internal/framework/service/`
- [X] T043 [P] [US2] Move `server/internal/services/logout_service.go` → `server/internal/framework/service/`
- [X] T044 [P] [US2] Move `server/internal/services/marketplace_service.go` → `server/internal/framework/service/`
- [X] T045 [P] [US2] Move `server/internal/services/messaging_service.go` → `server/internal/framework/service/`
- [X] T046 [P] [US2] Move `server/internal/services/moderation_client.go` → `server/internal/framework/service/`
- [X] T047 [P] [US2] Move `server/internal/services/moderation_service.go` → `server/internal/framework/service/`
- [X] T048 [P] [US2] Move `server/internal/services/notification_batcher.go` → `server/internal/framework/service/`
- [X] T049 [P] [US2] Move `server/internal/services/notification_service.go` → `server/internal/framework/service/`
- [X] T050 [P] [US2] Move `server/internal/services/ocr_service.go` → `server/internal/framework/service/`
- [X] T051 [P] [US2] Move `server/internal/services/openai_service.go` → `server/internal/framework/service/`
- [X] T052 [P] [US2] Move `server/internal/services/password_service.go` → `server/internal/framework/service/`
- [X] T053 [P] [US2] Move `server/internal/services/post_service.go` → `server/internal/framework/service/`
- [X] T054 [P] [US2] Move `server/internal/services/property_service.go` → `server/internal/framework/service/`
- [X] T055 [P] [US2] Move `server/internal/services/quest_progress_service.go` → `server/internal/framework/service/`
- [X] T056 [P] [US2] Move `server/internal/services/quest_service.go` → `server/internal/framework/service/`
- [X] T057 [P] [US2] Move `server/internal/services/queue_service.go` → `server/internal/framework/service/`
- [X] T058 [P] [US2] Move `server/internal/services/refresh_token_service.go` → `server/internal/framework/service/`
- [X] T059 [P] [US2] Move `server/internal/services/report_service.go` → `server/internal/framework/service/`
- [X] T060 [P] [US2] Move `server/internal/services/retry_service.go` → `server/internal/framework/service/`
- [X] T061 [P] [US2] Move `server/internal/services/rtmp_service.go` → `server/internal/framework/service/`
- [X] T062 [P] [US2] Move `server/internal/services/search_service.go` → `server/internal/framework/service/`
- [X] T063 [P] [US2] Move `server/internal/services/signup_service.go` → `server/internal/framework/service/`
- [X] T064 [P] [US2] Move `server/internal/services/social_gamification_service.go` → `server/internal/framework/service/`
- [X] T065 [P] [US2] Move `server/internal/services/social_service.go` → `server/internal/framework/service/`
- [X] T066 [P] [US2] Move `server/internal/services/token_cleanup_service.go` → `server/internal/framework/service/`
- [X] T067 [P] [US2] Move `server/internal/services/transaction_service.go` → `server/internal/framework/service/`
- [X] T068 [P] [US2] Move `server/internal/services/transcoding_service.go` → `server/internal/framework/service/`
- [X] T069 [P] [US2] Move `server/internal/services/two_factor_service.go` → `server/internal/framework/service/`
- [X] T070 [P] [US2] Move `server/internal/services/user_service.go` → `server/internal/framework/service/`
- [X] T071 [P] [US2] Move `server/internal/services/video_stream_service.go` → `server/internal/framework/service/`
- [X] T072 [US2] [US7] Update all imports from `internal/services` → `internal/framework/service` across codebase
- [X] T073 [US2] Create `server/internal/framework/service/index.go` with package exports (facade pattern per Q5)
- [X] T074 [US2] [US7] Run `go build ./...` in `server/` - verify zero errors
- [X] T074a [US2] Verify services embed `BaseService`: `grep -l "BaseService" server/internal/framework/service/*.go | wc -l` (FR-004)
- [X] T074b [US2] Spot-check 5 services for `BaseService` field: `achievement_service.go`, `auth_service.go`, `user_service.go`, `quest_service.go`, `notification_service.go`
- [X] T075 [US2] Delete empty `server/internal/services/` directory
- [X] T076 Create git tag `post-phase-3-services`

**Checkpoint**: All services in framework. Build passes.

---

## Phase 4: User Story 3 - Consolidate Repositories (Priority: P2)

**Goal**: All 39 repositories organized in `internal/framework/repository/`

**Independent Test**: `go build ./...` passes; all repositories importable from `internal/framework/repository`

- [ ] T077 Create git tag `pre-phase-4`
- [ ] T078 [P] [US3] Move `server/internal/repositories/achievement_repository.go` → `server/internal/framework/repository/`
- [ ] T079 [P] [US3] Move `server/internal/repositories/activity_repository.go` → `server/internal/framework/repository/`
- [ ] T080 [P] [US3] Move `server/internal/repositories/analytics_repository.go` → `server/internal/framework/repository/`
- [ ] T081 [P] [US3] Move `server/internal/repositories/audit_log_repository.go` → `server/internal/framework/repository/`
- [ ] T082 [P] [US3] Move `server/internal/repositories/auth_audit_log_repository.go` → `server/internal/framework/repository/`
- [ ] T083 [P] [US3] Move `server/internal/repositories/backup_code_repository.go` → `server/internal/framework/repository/`
- [ ] T084 [P] [US3] Move `server/internal/repositories/badge_repository.go` → `server/internal/framework/repository/`
- [ ] T085 [P] [US3] Move `server/internal/repositories/base_repository.go` → `server/internal/framework/repository/`
- [ ] T086 [P] [US3] Move `server/internal/repositories/comment_repository.go` → `server/internal/framework/repository/`
- [ ] T087 [P] [US3] Move `server/internal/repositories/content_milestone_repository.go` → `server/internal/framework/repository/`
- [ ] T088 [P] [US3] Move `server/internal/repositories/course_repository.go` → `server/internal/framework/repository/`
- [ ] T089 [P] [US3] Move `server/internal/repositories/daily_challenge_repository.go` → `server/internal/framework/repository/`
- [ ] T090 [P] [US3] Move `server/internal/repositories/dashboard_repository.go` → `server/internal/framework/repository/`
- [ ] T091 [P] [US3] Move `server/internal/repositories/encryption_key_repository.go` → `server/internal/framework/repository/`
- [ ] T092 [P] [US3] Move `server/internal/repositories/fcm_token_repository.go` → `server/internal/framework/repository/`
- [ ] T093 [P] [US3] Move `server/internal/repositories/follow_repository.go` → `server/internal/framework/repository/`
- [ ] T094 [P] [US3] Move `server/internal/repositories/group_member_repository.go` → `server/internal/framework/repository/`
- [ ] T095 [P] [US3] Move `server/internal/repositories/group_repository.go` → `server/internal/framework/repository/`
- [ ] T096 [P] [US3] Move `server/internal/repositories/leaderboard_repository.go` → `server/internal/framework/repository/`
- [ ] T097 [P] [US3] Move `server/internal/repositories/learning_challenge_repository.go` → `server/internal/framework/repository/`
- [ ] T098 [P] [US3] Move `server/internal/repositories/learning_level_repository.go` → `server/internal/framework/repository/`
- [ ] T099 [P] [US3] Move `server/internal/repositories/learning_streak_repository.go` → `server/internal/framework/repository/`
- [ ] T100 [P] [US3] Move `server/internal/repositories/learning_xp_repository.go` → `server/internal/framework/repository/`
- [ ] T101 [P] [US3] Move `server/internal/repositories/like_repository.go` → `server/internal/framework/repository/`
- [ ] T102 [P] [US3] Move `server/internal/repositories/marketplace_listing_repository.go` → `server/internal/framework/repository/`
- [ ] T103 [P] [US3] Move `server/internal/repositories/message_repository.go` → `server/internal/framework/repository/`
- [ ] T104 [P] [US3] Move `server/internal/repositories/notification_repository.go` → `server/internal/framework/repository/`
- [ ] T105 [P] [US3] Move `server/internal/repositories/notification_settings_repository.go` → `server/internal/framework/repository/`
- [ ] T106 [P] [US3] Move `server/internal/repositories/post_repository.go` → `server/internal/framework/repository/`
- [ ] T107 [P] [US3] Move `server/internal/repositories/property_repository.go` → `server/internal/framework/repository/`
- [ ] T108 [P] [US3] Move `server/internal/repositories/quest_progress_repository.go` → `server/internal/framework/repository/`
- [ ] T109 [P] [US3] Move `server/internal/repositories/quest_repository.go` → `server/internal/framework/repository/`
- [ ] T110 [P] [US3] Move `server/internal/repositories/refresh_token_repository.go` → `server/internal/framework/repository/`
- [ ] T111 [P] [US3] Move `server/internal/repositories/report_repository.go` → `server/internal/framework/repository/`
- [ ] T112 [P] [US3] Move `server/internal/repositories/social_xp_repository.go` → `server/internal/framework/repository/`
- [ ] T113 [P] [US3] Move `server/internal/repositories/transaction_repository.go` → `server/internal/framework/repository/`
- [ ] T114 [P] [US3] Move `server/internal/repositories/trusted_device_repository.go` → `server/internal/framework/repository/`
- [ ] T115 [P] [US3] Move `server/internal/repositories/two_factor_repository.go` → `server/internal/framework/repository/`
- [ ] T116 [P] [US3] Move `server/internal/repositories/user_repository.go` → `server/internal/framework/repository/`
- [ ] T117 [US3] [US7] Update all imports from `internal/repositories` → `internal/framework/repository` across codebase
- [ ] T118 [US3] Create `server/internal/framework/repository/index.go` with package exports (facade pattern per Q5)
- [ ] T119 [US3] [US7] Run `go build ./...` in `server/` - verify zero errors
- [ ] T119a [US3] Verify repos embed `GenericRepository`: `grep -l "GenericRepository" server/internal/framework/repository/*.go | wc -l` (FR-005)
- [ ] T119b [US3] Spot-check 5 repos for `GenericRepository` field: `user_repository.go`, `quest_repository.go`, `notification_repository.go`, `achievement_repository.go`, `post_repository.go`
- [ ] T120 [US3] Delete empty `server/internal/repositories/` directory
- [ ] T121 Create git tag `post-phase-4-repositories`

**Checkpoint**: All repositories in framework. Build passes.

---

## Phase 5: User Story 4 - Consolidate Controllers (Priority: P2)

**Goal**: All 39 controllers organized in `internal/framework/controller/`

**Independent Test**: `go build ./...` passes; all controllers importable from `internal/framework/controller`

- [X] T122 Create git tag `pre-phase-5`
- [X] T123 [P] [US4] Move `server/internal/controllers/achievement_controller.go` → `server/internal/framework/controller/`
- [X] T124 [P] [US4] Move `server/internal/controllers/analytics_controller.go` → `server/internal/framework/controller/`
- [X] T125 [P] [US4] Move `server/internal/controllers/auth_controller.go` → `server/internal/framework/controller/`
- [X] T126 [P] [US4] Move `server/internal/controllers/badge_controller.go` → `server/internal/framework/controller/`
- [X] T127 [P] [US4] Move `server/internal/controllers/blacklist_controller.go` → `server/internal/framework/controller/`
- [X] T128 [P] [US4] Move `server/internal/controllers/certificate_controller.go` → `server/internal/framework/controller/`
- [X] T129 [P] [US4] Move `server/internal/controllers/classified_ad_controller.go` → `server/internal/framework/controller/`
- [X] T130 [P] [US4] Move `server/internal/controllers/comment_controller.go` → `server/internal/framework/controller/`
- [X] T131 [P] [US4] Move `server/internal/controllers/course_controller.go` → `server/internal/framework/controller/`
- [X] T132 [P] [US4] Move `server/internal/controllers/dashboard_controller.go` → `server/internal/framework/controller/`
- [X] T133 [P] [US4] Move `server/internal/controllers/enrollment_controller.go` → `server/internal/framework/controller/`
- [X] T134 [P] [US4] Move `server/internal/controllers/follow_controller.go` → `server/internal/framework/controller/`
- [X] T135 [P] [US4] Move `server/internal/controllers/groups_controller.go` → `server/internal/framework/controller/`
- [X] T136 [P] [US4] Move `server/internal/controllers/interaction_controller.go` → `server/internal/framework/controller/`
- [X] T137 [P] [US4] Move `server/internal/controllers/kms_controller.go` → `server/internal/framework/controller/`
- [X] T138 [P] [US4] Move `server/internal/controllers/leaderboard_controller.go` → `server/internal/framework/controller/`
- [X] T139 [P] [US4] Move `server/internal/controllers/learning_gamification_controller.go` → `server/internal/framework/controller/`
- [X] T140 [P] [US4] Move `server/internal/controllers/lesson_controller.go` → `server/internal/framework/controller/`
- [X] T141 [P] [US4] Move `server/internal/controllers/like_controller.go` → `server/internal/framework/controller/`
- [X] T142 [P] [US4] Move `server/internal/controllers/marketplace_controller.go` → `server/internal/framework/controller/`
- [X] T143 [P] [US4] Move `server/internal/controllers/messages_controller.go` → `server/internal/framework/controller/`
- [X] T144 [P] [US4] Move `server/internal/controllers/metrics_controller.go` → `server/internal/framework/controller/`
- [X] T145 [P] [US4] Move `server/internal/controllers/moderation_controller.go` → `server/internal/framework/controller/`
- [X] T146 [P] [US4] Move `server/internal/controllers/notifications_controller.go` → `server/internal/framework/controller/`
- [X] T147 [P] [US4] Move `server/internal/controllers/post_controller.go` → `server/internal/framework/controller/`
- [X] T148 [P] [US4] Move `server/internal/controllers/property_controller.go` → `server/internal/framework/controller/`
- [X] T149 [P] [US4] Move `server/internal/controllers/quest_controller.go` → `server/internal/framework/controller/`
- [X] T150 [P] [US4] Move `server/internal/controllers/quest_progress_controller.go` → `server/internal/framework/controller/`
- [X] T151 [P] [US4] Move `server/internal/controllers/report_controller.go` → `server/internal/framework/controller/`
- [X] T152 [P] [US4] Move `server/internal/controllers/social_controller.go` → `server/internal/framework/controller/`
- [X] T153 [P] [US4] Move `server/internal/controllers/social_gamification_controller.go` → `server/internal/framework/controller/`
- [X] T154 [P] [US4] Move `server/internal/controllers/token_controller.go` → `server/internal/framework/controller/`
- [X] T155 [P] [US4] Move `server/internal/controllers/transaction_controller.go` → `server/internal/framework/controller/`
- [X] T156 [P] [US4] Move `server/internal/controllers/two_factor_controller.go` → `server/internal/framework/controller/`
- [X] T157 [P] [US4] Move `server/internal/controllers/user_controller.go` → `server/internal/framework/controller/`
- [X] T158 [P] [US4] Move `server/internal/controllers/video_streaming_controller.go` → `server/internal/framework/controller/`
- [X] T159 [P] [US4] Move `server/internal/controllers/websocket_controller.go` → `server/internal/framework/controller/`
- [X] T160 [US4] [US7] Update all imports from `internal/controllers` → `internal/framework/controller` across codebase
- [X] T161 [US4] Update `server/internal/framework/controller/index.go` with domain controller exports
- [X] T162 [US4] [US7] Run `go build ./...` in `server/` - verify zero errors
- [X] T163 [US4] Delete empty `server/internal/controllers/` directory
- [X] T164 Create git tag `post-phase-5-controllers`

**Checkpoint**: All controllers in framework. Build passes.

---

## Phase 6: User Story 5 - Consolidate Routes (Priority: P3)

**Goal**: All 21 routes organized in `internal/framework/routes/`

**Independent Test**: `go build ./...` passes; all routes importable from `internal/framework/routes`

- [X] T165 Create git tag `pre-phase-6`
- [X] T166 [P] [US5] Move `server/internal/routes/admin_routes.go` → `server/internal/framework/routes/`
- [X] T167 [P] [US5] Move `server/internal/routes/analytics_routes.go` → `server/internal/framework/routes/`
- [X] T168 [P] [US5] Move `server/internal/routes/auth_routes.go` → `server/internal/framework/routes/`
- [X] T169 [P] [US5] Move `server/internal/routes/certificate_routes.go` → `server/internal/framework/routes/`
- [X] T170 [P] [US5] Move `server/internal/routes/classified_routes.go` → `server/internal/framework/routes/`
- [X] T171 [P] [US5] Move `server/internal/routes/follow_routes.go` → `server/internal/framework/routes/`
- [X] T172 [P] [US5] Move `server/internal/routes/gamification_routes.go` → `server/internal/framework/routes/`
- [X] T173 [P] [US5] Move `server/internal/routes/leaderboard_routes.go` → `server/internal/framework/routes/`
- [X] T174 [P] [US5] Move `server/internal/routes/learning_gamification_routes.go` → `server/internal/framework/routes/`
- [X] T175 [P] [US5] Move `server/internal/routes/lms_routes.go` → `server/internal/framework/routes/`
- [X] T176 [P] [US5] Move `server/internal/routes/messages_routes.go` → `server/internal/framework/routes/`
- [X] T177 [P] [US5] Move `server/internal/routes/metrics_routes.go` → `server/internal/framework/routes/`
- [X] T178 [P] [US5] Move `server/internal/routes/notifications_routes.go` → `server/internal/framework/routes/`
- [X] T179 [P] [US5] Move `server/internal/routes/property_routes.go` → `server/internal/framework/routes/`
- [X] T180 [P] [US5] Move `server/internal/routes/reports_routes.go` → `server/internal/framework/routes/`
- [X] T181 [P] [US5] Move `server/internal/routes/routes.go` → `server/internal/framework/routes/`
- [X] T182 [P] [US5] Move `server/internal/routes/social_gamification_routes.go` → `server/internal/framework/routes/`
- [X] T183 [P] [US5] Move `server/internal/routes/social_routes.go` → `server/internal/framework/routes/`
- [X] T184 [P] [US5] Move `server/internal/routes/stream_routes.go` → `server/internal/framework/routes/`
- [X] T185 [P] [US5] Move `server/internal/routes/transaction_routes.go` → `server/internal/framework/routes/`
- [X] T186 [P] [US5] Move `server/internal/routes/websocket_routes.go` → `server/internal/framework/routes/`
- [X] T187 [US5] [US7] Update all imports from `internal/routes` → `internal/framework/routes` across codebase
- [X] T188 [US5] Create `server/internal/framework/routes/index.go` with package exports (facade pattern per Q5)
- [X] T189 [US5] [US7] Run `go build ./...` in `server/` - verify zero errors
- [X] T190 [US5] Delete empty `server/internal/routes/` directory
- [X] T191 Create git tag `post-phase-6-routes`

**Checkpoint**: All routes in framework. Build passes.

---

## Phase 7: User Story 6 - Consolidate Models Review (Priority: P3)

**Goal**: Verify models remain at `internal/models/` as shared package

**Independent Test**: Models implement `TenantModel` interface where appropriate

- [X] T192 [US6] Verify `server/internal/models/` stays in place (no move needed per spec)
- [X] T193 [US6] Audit tenant-scoped models implement `TenantModel` interface
- [X] T194 [US6] [US7] Update any model imports if needed for consistency
- [X] T195 Create git tag `post-phase-7-models-verified`

**Checkpoint**: Models verified. No changes needed.

---

## Phase 8: Merge Utils (P3)

**Goal**: Utils consolidated in `internal/framework/utils/`

- [X] T196 Create git tag `pre-phase-8`
- [X] T197 [P] Move `server/internal/utils/response.go` → `server/internal/framework/utils/`
- [X] T198 [P] Move `server/internal/utils/validation.go` → `server/internal/framework/utils/`
- [X] T199 [US7] Update all imports from `internal/utils` → `internal/framework/utils` across codebase
- [X] T200 Create `server/internal/framework/utils/index.go` with package exports (facade pattern per Q5)
- [X] T201 [US7] Run `go build ./...` in `server/` - verify zero errors
- [X] T202 Delete empty `server/internal/utils/` directory
- [X] T203 Create git tag `post-phase-8-utils`

**Checkpoint**: Utils merged. Build passes.

---

## Phase 9: Polish & Final Verification

**Purpose**: Final cleanup and comprehensive verification

- [X] T204 [US7] Run `go build ./...` in `server/` - final build verification
- [X] T205 [US7] Run `go test ./...` in `server/` - full test suite verification
- [X] T206 Record final build time and compare to baseline (SC-009: within 10%)
- [X] T207 Verify zero duplicate type declarations (SC-003)
- [X] T208 Verify `internal/app/` contains only `app.go` (SC-005)
- [X] T209 [P] Update any documentation referencing old paths
- [X] T210 Create final git tag `026-server-framework-consolidation-complete`
- [X] T211 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational/Duplicates) → Phase 3-8 (User Stories) → Phase 9 (Polish)
                           ↓
                    BLOCKS ALL FILE MOVES
```

### User Story Dependencies

| Story | Phase | Can Start After | Dependencies |
|-------|-------|-----------------|--------------|
| US1 (Duplicates) | 2 | Phase 1 | None |
| US7 (Imports) | 2-8 | Each file move | Continuous throughout |
| US2 (Services) | 3 | Phase 2 complete | US1 |
| US3 (Repositories) | 4 | Phase 3 complete | US2 |
| US4 (Controllers) | 5 | Phase 4 complete | US3 |
| US5 (Routes) | 6 | Phase 5 complete | US4 |
| US6 (Models) | 7 | Phase 6 complete | US5 |

### Within Each Phase

1. Create rollback tag
2. Move files (parallelizable within phase)
3. Update imports
4. Create index.go
5. Verify build
6. Delete empty directory
7. Create checkpoint tag

### Parallel Opportunities

**Phase 3 (Services)**: All T013-T071 can run in parallel (different files)
**Phase 4 (Repositories)**: All T078-T116 can run in parallel
**Phase 5 (Controllers)**: All T123-T159 can run in parallel
**Phase 6 (Routes)**: All T166-T186 can run in parallel
**Phase 8 (Utils)**: T197-T198 can run in parallel

---

## Implementation Strategy

### Sequential Execution (Recommended for Solo Developer)

1. Phase 1: Setup (3 tasks)
2. Phase 2: Foundational - fix duplicates first (8 tasks)
3. Phase 3: Services (65 tasks) - bulk move with sed for imports
4. Phase 4: Repositories (45 tasks) - bulk move with sed for imports
5. Phase 5: Controllers (43 tasks) - bulk move with sed for imports
6. Phase 6: Routes (27 tasks) - bulk move with sed for imports
7. Phase 7: Models verification (4 tasks)
8. Phase 8: Utils (8 tasks)
9. Phase 9: Polish (8 tasks)

### Bulk Operations

For efficiency, phases 3-6 can use bulk operations:

```bash
# Example: Move all services at once
mv server/internal/services/*.go server/internal/framework/service/

# Example: Update imports with sed
find server/ -name "*.go" -exec sed -i 's|internal/services|internal/framework/service|g' {} \;

# Example: Run goimports to clean up
goimports -w server/
```

---

## Notes

- **[P]** = Parallelizable (different files, no dependencies)
- **[USx]** = User Story mapping per spec.md
- Total tasks: 211
- Rollback capability at every phase boundary
- Build verification after each major phase
- Test suite run only at final phase (per quickstart.md)
