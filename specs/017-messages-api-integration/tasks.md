# Implementation Tasks: Messages API Integration

**Feature**: 017-messages-api-integration  
**Date**: November 28, 2025  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Configure query infrastructure for messaging feature

- [X] T001 Add `messages` query key factory to `client/core/query/keys.ts`
- [X] T002 [P] Add `MESSAGES_THREADS` (30s) and `MESSAGES` (60s) stale times to `client/core/query/constants.ts`
- [X] T003 [P] Add `MessageFilters` type to `client/core/types/query.types.ts`

**Checkpoint**: Query infrastructure ready for messaging hooks

---

## Phase 2: Foundational (Core Query & Mutation Hooks)

**Purpose**: Create core hooks that all user stories depend on - BLOCKS all user stories

### Query Hooks Base

- [X] T004 Create `useMessages.ts` with `useMessageThreads` hook in `client/core/hooks/queries/useMessages.ts`
- [X] T005 Add `useConversationMessages` hook with infinite scroll in `client/core/hooks/queries/useMessages.ts`
- [X] T006 [P] Add `useGroupMessages` hook with infinite scroll in `client/core/hooks/queries/useMessages.ts`
- [X] T007 [P] Add `useUnreadCount` hook in `client/core/hooks/queries/useMessages.ts`
- [X] T008 [P] Add `useSearchMessages` hook in `client/core/hooks/queries/useMessages.ts`
- [X] T008.1 [P] Add `useRecentMessages` hook (limit 3, reuses threads query) in `client/core/hooks/queries/useMessages.ts`
- [X] T009 Export message hooks from `client/core/hooks/queries/index.ts`

### Mutation Hooks Base

- [X] T010 Create `useMessageMutations.ts` with `useSendDirectMessage` mutation in `client/core/hooks/mutations/useMessageMutations.ts`
- [X] T011 Add `useSendGroupMessage` mutation with optimistic update in `client/core/hooks/mutations/useMessageMutations.ts`
- [X] T012 [P] Add `useMarkAsRead` mutation in `client/core/hooks/mutations/useMessageMutations.ts`
- [X] T013 [P] Add `useDeleteMessage` mutation with optimistic update in `client/core/hooks/mutations/useMessageMutations.ts`
- [X] T014 Export mutation hooks from `client/core/hooks/mutations/index.ts`

### Cache Invalidation

- [X] T015 Add message invalidation rules to `client/core/query/invalidation.ts`

**Checkpoint**: All core hooks available for component integration

---

## Phase 3: User Story 1 - View Message Threads (Priority: P1)

**Goal**: Display list of message conversations sorted by most recent, replacing any mock thread data

**Independent Test**: Authenticate → Navigate to Messages → See real threads with participant name, preview, timestamp, unread indicator

### Implementation for User Story 1

- [X] T016 [US1] Sync `MessageThread` and `Message` types in `client/components/pages/communicate/Messages/types.ts` with service types
- [X] T017 [US1] Integrate `useMessageThreads` hook into `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T018 [US1] Add loading skeleton state to `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T019 [US1] Add error state with retry button to `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T020 [US1] Add empty state for no conversations in `client/components/pages/communicate/Messages/MessageList.tsx`

**Checkpoint**: Message threads display with real data, loading states, and error handling

---

## Phase 4: User Story 2 - View Conversation Messages (Priority: P1)

**Goal**: Display full conversation history with infinite scroll when a thread is selected

**Independent Test**: Select a thread → See all messages in chronological order → Scroll up to load older messages

### Implementation for User Story 2

- [X] T021 [US2] Verify `Message` type alignment (synced in T016) in `client/components/pages/communicate/Messages/types.ts`
- [X] T022 [US2] Create `ConversationView.tsx` component with `useConversationMessages` hook in `client/components/pages/communicate/Messages/ConversationView.tsx`
- [X] T023 [US2] Implement infinite scroll (load older messages on scroll up) in `client/components/pages/communicate/Messages/ConversationView.tsx`
- [X] T024 [P] [US2] Update `MessageItem.tsx` to render individual messages with sender, content, timestamp in `client/components/pages/communicate/Messages/MessageItem.tsx`
- [X] T024.1 [P] [US2] Add delete message button with confirmation dialog to `MessageItem.tsx` (FR-016: own messages only) in `client/components/pages/communicate/Messages/ConversationView.tsx`
- [X] T025 [US2] Add loading indicator for conversation loading in `client/components/pages/communicate/Messages/ConversationView.tsx`
- [X] T026 [US2] Add error state with retry option in `client/components/pages/communicate/Messages/ConversationView.tsx`

**Checkpoint**: Full conversation history viewable with infinite scroll

---

## Phase 5: User Story 3 - Send Direct Messages (Priority: P2)

**Goal**: Enable sending messages with optimistic UI updates and error handling

**Independent Test**: Type a message → Tap send → Message appears immediately → Verify message persists after API confirms

### Implementation for User Story 3

- [X] T027 [US3] Create `MessageComposer.tsx` component with send functionality in `client/components/pages/communicate/Messages/MessageComposer.tsx`
- [X] T028 [US3] Integrate `useSendDirectMessage` mutation with optimistic update in `client/components/pages/communicate/Messages/MessageComposer.tsx`
- [X] T029 [US3] Add 2000 character limit validation in `client/components/pages/communicate/Messages/MessageComposer.tsx`
- [X] T030 [US3] Add send button enabled/disabled state based on input in `client/components/pages/communicate/Messages/MessageComposer.tsx`
- [X] T031 [US3] Add error state with retry option for failed sends in `client/components/pages/communicate/Messages/MessageComposer.tsx`
- [X] T032 [US3] Integrate `MessageComposer` into `ConversationView.tsx` in `client/components/pages/communicate/Messages/ConversationView.tsx`

**Checkpoint**: Users can send direct messages with optimistic updates and retry on failure

---

## Phase 6: User Story 4 - Dashboard Recent Messages (Priority: P2)

**Goal**: Replace hardcoded mock messages in CommunicateDashboard with real API data

**Independent Test**: Navigate to Communicate Dashboard → See real recent messages → Tap to navigate to full messages view

### Implementation for User Story 4

- [X] T033 [US4] Integrate `useRecentMessages` hook (created in T008.1) into dashboard in `client/components/pages/communicate/CommunicateDashboard.tsx`
- [X] T034 [US4] Replace mock message data with `useRecentMessages` hook in `client/components/pages/communicate/CommunicateDashboard.tsx` (lines 35-58)
- [X] T035 [US4] Add loading skeleton for recent messages section in `client/components/pages/communicate/CommunicateDashboard.tsx`
- [X] T036 [US4] Add error state for recent messages section in `client/components/pages/communicate/CommunicateDashboard.tsx`
- [X] T037 [US4] Implement tap handler to navigate to full messages view in `client/components/pages/communicate/CommunicateDashboard.tsx`

**Checkpoint**: Dashboard displays real recent messages with proper states

---

## Phase 7: User Story 5 - Unread Message Count (Priority: P2)

**Goal**: Display accurate unread message count across messaging UI

**Independent Test**: Check unread count → Read a message → Return to thread list → Verify count decreased

### Implementation for User Story 5

- [X] T038 [US5] Add unread count badge to message threads list in `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T039 [US5] Add unread count to dashboard messages section header in `client/components/pages/communicate/CommunicateDashboard.tsx`
- [X] T040 [US5] Implement cache update when messages are read (update unread count) in `client/core/hooks/mutations/useMessageMutations.ts`

**Checkpoint**: Unread counts display accurately and update when messages are read

---

## Phase 8: User Story 6 - Mark Messages as Read (Priority: P3)

**Goal**: Automatically mark messages as read when conversation is viewed

**Independent Test**: Open conversation with unread messages → Messages automatically marked as read → Thread no longer shows unread

### Implementation for User Story 6

- [X] T041 [US6] Integrate `useMarkAsRead` mutation on conversation open in `client/components/pages/communicate/Messages/ConversationView.tsx`
- [X] T042 [US6] Update thread's unread indicator when conversation is marked as read in `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T043 [US6] Invalidate unread count query after marking as read in `client/core/hooks/mutations/useMessageMutations.ts`

**Checkpoint**: Messages automatically marked as read with UI updates

---

## Phase 9: User Story 7 - Search Messages (Priority: P3)

**Goal**: Enable searching through messages by content

**Independent Test**: Enter search query → See matching messages → Empty state when no matches

### Implementation for User Story 7

- [X] T044 [US7] Integrate `useSearchMessages` hook into `client/components/pages/communicate/Messages/MessageSearch.tsx`
- [X] T045 [US7] Add search results display with highlighted matches in `client/components/pages/communicate/Messages/MessageSearch.tsx`
- [X] T046 [US7] Add loading indicator during search in `client/components/pages/communicate/Messages/MessageSearch.tsx`
- [X] T047 [US7] Add empty state for no search results in `client/components/pages/communicate/Messages/MessageSearch.tsx`
- [X] T048 [US7] Add debounced search input (300ms) in `client/components/pages/communicate/Messages/MessageSearch.tsx`

**Checkpoint**: Search functionality working with proper states

---

## Phase 10: User Story 8 - View and Send Group Messages (Priority: P3)

**Goal**: Enable participating in group conversations

**Independent Test**: View group thread → See group messages with sender attribution → Send message to group

### Implementation for User Story 8

- [X] T049 [US8] Add group indicator/badge to thread list items in `client/components/pages/communicate/Messages/MessageList.tsx`
- [X] T050 [US8] Create `GroupConversationView.tsx` component with `useGroupMessages` hook in `client/components/pages/communicate/Messages/GroupConversationView.tsx`
- [X] T051 [US8] Integrate `useSendGroupMessage` mutation in `client/components/pages/communicate/Messages/GroupConversationView.tsx`
- [X] T052 [P] [US8] Add sender attribution display for group messages in `client/components/pages/communicate/Messages/MessageItem.tsx`
- [X] T053 [US8] Implement infinite scroll for group conversation in `client/components/pages/communicate/Messages/GroupConversationView.tsx`
- [X] T054 [US8] Add group header with member count in `client/components/pages/communicate/Messages/GroupConversationView.tsx`

**Checkpoint**: Group messaging fully functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and quality assurance

- [X] T055 [P] Verify all mock message data removed from codebase (search for hardcoded messages)
- [X] T056 [P] Run TypeScript type check (`npx tsc --noEmit`) in `client/`
- [X] T057 [P] Run ESLint (`npx eslint --ext .ts,.tsx`) in `client/` - N/A (no ESLint config in project)
- [X] T058 Verify cache invalidation works correctly (send message → thread list updates)
- [X] T059 Test optimistic updates and rollback on failure
- [X] T060 Run `quickstart.md` validation checklist
- [X] T061 Update `client/components/pages/communicate/Messages/index.ts` exports

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - US1 (Threads) and US2 (Conversation) are P1 - complete first
  - US3-5 are P2 - complete after P1 stories
  - US6-8 are P3 - complete last
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (View Threads)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (View Conversation)**: Can start after Foundational (Phase 2) - Can run parallel to US1
- **US3 (Send Direct)**: Benefits from US2 (ConversationView exists) - can still implement independently
- **US4 (Dashboard Messages)**: Independent of other stories - uses different component
- **US5 (Unread Count)**: Can integrate with US1 (thread list) - adds badges to existing UI
- **US6 (Mark as Read)**: Benefits from US2 (ConversationView) and US5 (unread count)
- **US7 (Search)**: Independent - uses MessageSearch component
- **US8 (Group Messages)**: Can run parallel to direct message stories - separate conversation view

### Within Each User Story

- Type updates before component integration
- Hooks integration before loading/error states
- Core functionality before polish features
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T002 and T003 can run in parallel
- Foundational tasks T006, T007, T008 can run in parallel (different query hooks)
- Foundational tasks T012 and T013 can run in parallel (different mutation hooks)
- US1 and US2 can run in parallel (different components)
- US4 is independent and can run parallel to other P2 stories
- US7 and US8 can run in parallel (different components)
- Polish tasks T055, T056, T057 can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# All Setup tasks after T001:
T002: Add MESSAGES_THREADS and MESSAGES stale times to constants.ts
T003: Add MessageFilters type to query.types.ts
# T002 and T003 can run in parallel after T001
```

---

## Parallel Example: Foundational Phase

```bash
# After T004 and T005 (base hooks):
T006: useGroupMessages hook
T007: useUnreadCount hook  
T008: useSearchMessages hook
# All can run in parallel (different hooks, same file but independent)

# After T010 and T011:
T012: useMarkAsRead mutation
T013: useDeleteMessage mutation
# Can run in parallel (different mutations)
```

---

## Parallel Example: User Stories

```bash
# After Foundational phase completes:
# Developer A: User Story 1 (View Threads) - T016-T020
# Developer B: User Story 2 (View Conversation) - T021-T026
# Both can start immediately in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T015) - CRITICAL
3. Complete Phase 3: User Story 1 - View Threads (T016-T020)
4. Complete Phase 4: User Story 2 - View Conversation (T021-T026)
5. **STOP and VALIDATE**: Can view threads and read conversations with real data
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Query infrastructure ready
2. Add US1 (Threads) → Test → Deploy (can see conversations!)
3. Add US2 (Conversation) → Test → Deploy (can read messages!)
4. Add US3 (Send Direct) → Test → Deploy (bidirectional messaging!)
5. Add US4 (Dashboard) → Test → Deploy (dashboard shows real data!)
6. Add US5-8 → Test → Deploy (polish features)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Threads) + US4 (Dashboard)
   - Developer B: US2 (Conversation) + US3 (Send)
   - Developer C: US7 (Search) + US8 (Groups)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files or independent sections, no conflicts
- [US#] label maps task to specific user story for traceability
- Server endpoints already exist - this is client-only integration
- Service layer (`messages.service.ts`) already complete with 15+ methods
- Pattern reference: `useAnalytics.ts` for queries, `useUserMutations.ts` for mutations
- Mock data location: `CommunicateDashboard.tsx` lines 35-58 (3 mock messages)
- Stale times per FR-010: 30s for threads, 60s for messages
- Message max length per FR-017: 2,000 characters
- Delete own messages only per FR-016 (T024.1 handles UI, T013 handles mutation)
- Retry behavior: Failed messages retry up to 3 times with exponential backoff (1s, 2s, 4s); user sees 'Retry' button after all attempts fail
