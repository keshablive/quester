# Feature Specification: Analytics API Integration

**Feature Branch**: `016-analytics-api-integration`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Integrate analytics dashboard components with real API data, replacing hardcoded mock statistics with live data from the analytics service"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Key Metrics Dashboard (Priority: P1)

As a user, I want to see my actual platform engagement metrics (page views, activity levels, session data) on the analytics dashboard instead of fake hardcoded numbers, so I can understand my real usage patterns.

**Why this priority**: Key metrics are the first thing users see on the analytics page. Without real data, the entire analytics feature provides zero value.

**Independent Test**: Navigate to /analytics after login, verify the Key Metrics cards display numbers from the API (not "45.2K", "32.8%", "3.42%"). Numbers should reflect actual user activity data.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they navigate to /analytics, **Then** the Key Metrics component displays real metrics fetched from the user analytics API
2. **Given** the analytics API returns user summary data, **When** the Key Metrics component loads, **Then** page views show totalSessions, activity shows averageScore, and engagement shows coursesCompleted
3. **Given** the analytics API is slow to respond, **When** loading Key Metrics, **Then** skeleton loaders are displayed until data arrives
4. **Given** the analytics API fails, **When** Key Metrics attempts to load, **Then** an error state is displayed with a retry option

---

### User Story 2 - View Top Performing Content (Priority: P1)

As a user, I want to see which courses/content have the highest engagement on the platform, so I can discover popular learning materials.

**Why this priority**: Top content drives user engagement by highlighting valuable courses. Static fake data ("/dashboard 12.5K views") provides no discovery value.

**Independent Test**: Verify TopPages component displays actual top courses from the API with real enrollment counts and completion rates.

**Acceptance Scenarios**:

1. **Given** a user views the analytics page, **When** the Top Pages/Content section loads, **Then** it displays real top courses from the getTopCourses API endpoint
2. **Given** courses have different performance metrics, **When** viewing top content, **Then** courses are ordered by enrollment count descending
3. **Given** no courses exist, **When** viewing top content, **Then** an empty state message is displayed

---

### User Story 3 - View Traffic Overview Chart (Priority: P2)

As a user, I want to see a visual representation of platform activity over time, so I can identify trends in engagement.

**Why this priority**: Visual charts provide quick insights but require more implementation effort than simple metrics.

**Independent Test**: Verify TrafficOverview displays a time-series chart with real data points from the engagement timeseries API.

**Acceptance Scenarios**:

1. **Given** a user views the analytics overview tab, **When** Traffic Overview loads, **Then** it displays a chart visualization with real time-series data
2. **Given** time-series data spans 30 days, **When** viewing the chart, **Then** each data point represents a day's engagement value
3. **Given** no time-series data exists, **When** viewing Traffic Overview, **Then** an empty chart state is displayed with appropriate messaging

---

### User Story 4 - View Platform Engagement Metrics (Priority: P2)

As a user, I want to see platform-wide engagement metrics (daily/weekly/monthly active users), so I can understand overall platform health.

**Why this priority**: Platform metrics provide valuable context about engagement levels across the system. Device/location breakdown deferred (API not available).

**Independent Test**: Verify Demographics component shows real DAU, WAU, MAU from engagement summary API instead of hardcoded location/device percentages.

**Acceptance Scenarios**:

1. **Given** a user views the analytics page, **When** Demographics loads, **Then** it displays DAU, WAU, MAU from the engagement summary API
2. **Given** engagement data is loading, **When** waiting for API response, **Then** skeleton loaders are shown
3. **Given** the API returns active user counts, **When** displayed, **Then** numbers are formatted for readability using formatCompactNumber

---

### User Story 5 - Analytics Data Freshness (Priority: P3)

As a user, I want analytics data to refresh appropriately, so I see reasonably current information without excessive API calls.

**Why this priority**: Data freshness affects UX but is a polish feature after core functionality works.

**Independent Test**: Navigate away from analytics and return - verify cached data displays instantly, then refreshes in background if stale.

**Acceptance Scenarios**:

1. **Given** a user has previously loaded analytics, **When** returning to the analytics page, **Then** cached data displays immediately while fresh data loads in background
2. **Given** analytics data is less than 5 minutes old, **When** revisiting analytics, **Then** no new API request is made
3. **Given** analytics data is more than 5 minutes old, **When** revisiting analytics, **Then** background refresh occurs

---

### Edge Cases

- What happens when the user has no activity data (new user)?
  - Display zero values with "No activity yet" messaging
- What happens when the API returns partial data?
  - Display available data, show "—" for missing fields
- How does the system handle network timeout?
  - Show error state with retry button after 10 second timeout
- What happens during time zone differences?
  - All dates displayed in user's local timezone

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch user analytics summary from /api/analytics/users/:userId/summary endpoint
- **FR-002**: System MUST display real totalSessions, averageScore, coursesCompleted in Key Metrics
- **FR-003**: System MUST fetch top courses from /api/analytics/courses/top endpoint
- **FR-004**: System MUST display top courses with real enrollment counts and completion rates
- **FR-005**: System MUST fetch engagement time-series from /api/analytics/engagement/timeseries endpoint
- **FR-006**: System MUST render time-series data in Traffic Overview visualization
- **FR-007**: System MUST show loading skeletons during data fetching for all analytics components
- **FR-008**: System MUST show error states with retry capability when API calls fail
- **FR-009**: System MUST cache analytics data with 5-minute stale time to reduce API calls
- **FR-010**: System MUST format large numbers for readability (e.g., 1000 → "1K", 1500000 → "1.5M")
- **FR-011**: System MUST calculate and display percentage changes comparing current 7 days vs. previous 7 days (week-over-week)

### Key Entities

- **UserAnalyticsSummary**: User's aggregated activity data (totalSessions, totalTimeSpent, coursesCompleted, averageScore, lastActive)
- **TopCourse**: High-performing course data (id, title, enrollmentCount, completionRate, averageRating)
- **TimeSeriesData**: Daily data points for charting (date, value)
- **EngagementSummary**: Platform-wide engagement metrics (dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers, averageSessionDuration)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analytics page displays no hardcoded values - all metrics reflect real API data (verified by absence of "45.2K", "32.8%", "3.42%", "12.5K views" placeholder strings)
- **SC-002**: Users see their analytics data within 3 seconds of page load under normal network conditions
- **SC-003**: Returning to analytics page shows cached data instantly (under 100ms) before background refresh
- **SC-004**: All four analytics components (KeyMetrics, TopPages, TrafficOverview, Demographics) show loading skeletons during data fetch
- **SC-005**: Error states allow retry without full page refresh
- **SC-006**: Zero-data states display user-friendly messaging rather than empty components

## Clarifications

### Session 2025-11-28

- Q: What time period should be used for percentage change comparison in FR-011? → A: Week-over-week (previous 7 days vs. current 7 days)

## Assumptions

- Server analytics endpoints are functional and return data in documented format
- User must be authenticated to view analytics (auth handled by existing middleware)
- Analytics data aggregation runs via existing cron jobs on the server
- Chart visualization will use placeholder/simple representation initially (full charting library integration is separate scope)

## Out of Scope

- Historical date range selection (future feature)
- Export analytics to CSV/PDF
- Custom dashboard configuration
- Real-time live updates (WebSocket)
- Geographic location breakdown (API endpoint doesn't exist)
- Full charting library integration (will use simplified visualization)
