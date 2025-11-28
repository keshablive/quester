# Quester Platform - AI Agent Rules & Standards

> **Comprehensive Rule Book for AI Code Generation**
> This document contains all coding standards, patterns, and rules that AI agents MUST follow when working with the Quester platform.

---

## 1. CRITICAL RULES - NEVER VIOLATE

### 1.1 Multi-Tenancy (MANDATORY)

**Rule**: Every database query MUST filter by `TenantID`. No exceptions.

```go
// ✅ CORRECT
func (r *repository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&model).Error
    return &model, err
}

// ❌ WRONG - Missing TenantID filter
func (r *repository) FindByID(ctx context.Context, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error
    return &model, err
}
```

**Enforcement**:
- All GORM models MUST include `TenantID uuid.UUID` field
- All queries MUST include `Where("tenant_id = ?", tenantID)`
- All indexes MUST include `tenant_id` for performance
- Extract `tenantID` from JWT claims in controllers

### 1.2 Security First

**Rules**:
- NEVER log sensitive data (passwords, tokens, API keys, credit cards)
- ALWAYS validate and sanitize user inputs
- ALWAYS use parameterized queries (GORM handles this)
- NEVER trust client-provided data
- ALWAYS hash passwords with bcrypt (cost 12+)
- ALWAYS use HTTPS in production
- ALWAYS set secure, httpOnly cookies for tokens

```go
// ✅ CORRECT - Safe logging
log.Printf("User login attempt: email=%s", email)

// ❌ WRONG - Exposes sensitive data
log.Printf("Login: email=%s, password=%s, token=%s", email, password, token)

// ✅ CORRECT - Input validation
if err := validator.Validate(input); err != nil {
    return responses.BadRequest(ctx, "Invalid input")
}

// ❌ WRONG - No validation
user := &models.User{Email: input.Email} // Trusting raw input
```

### 1.3 Type Safety

**Rules**:
- NO `any` type in TypeScript (use `unknown` if truly needed, then type-guard)
- NO untyped function parameters in Go
- ALWAYS define explicit return types
- ALWAYS use interfaces for polymorphism
- ALWAYS validate types at runtime for external data

```typescript
// ✅ CORRECT
interface UserData {
  id: string;
  email: string;
  name: string;
}

async function getUser(id: string): Promise<UserData> {
  const response = await apiClient.get<UserData>(`/users/${id}`);
  return response.data;
}

// ❌ WRONG
async function getUser(id: any): Promise<any> {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
}
```

```go
// ✅ CORRECT
func ProcessUser(ctx context.Context, userID uuid.UUID, data *UserInput) error {
    // Implementation
}

// ❌ WRONG
func ProcessUser(ctx context.Context, userID, data interface{}) error {
    // Implementation
}
```

### 1.4 Error Handling

**Go Rules**:
- ALWAYS return errors from functions
- NEVER use `panic()` for expected errors
- ALWAYS check returned errors immediately
- Use custom error types for domain errors
- Wrap errors with context using `fmt.Errorf("context: %w", err)`

```go
// ✅ CORRECT
func (s *Service) Create(ctx context.Context, input *Input) (*Model, error) {
    if err := s.validate(input); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    model, err := s.repo.Create(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to create: %w", err)
    }
    
    return model, nil
}

// ❌ WRONG
func (s *Service) Create(ctx context.Context, input *Input) *Model {
    s.validate(input) // Ignoring error
    model, _ := s.repo.Create(ctx, input) // Ignoring error
    return model
}
```

**TypeScript Rules**:
- ALWAYS use try-catch for async operations
- ALWAYS provide user-friendly error messages
- NEVER expose internal errors to users
- Log full error details for debugging

```typescript
// ✅ CORRECT
async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const response = await apiClient.post<User>('/users', input);
    return response.data;
  } catch (error) {
    console.error('Failed to create user:', error);
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw new Error('Failed to create user. Please try again.');
  }
}

// ❌ WRONG
async function createUser(input: CreateUserInput): Promise<User> {
  const response = await apiClient.post<User>('/users', input);
  return response.data; // No error handling
}
```

### 1.5 Context Propagation (Go)

**Rule**: ALWAYS pass `context.Context` as the first parameter of all public functions.

```go
// ✅ CORRECT
func (s *Service) GetUser(ctx context.Context, id uuid.UUID) (*User, error) {
    return s.repo.FindByID(ctx, id)
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, id).Error
    return &user, err
}

// ❌ WRONG
func (s *Service) GetUser(id uuid.UUID) (*User, error) {
    return s.repo.FindByID(id)
}
```

**Why**: Enables cancellation, timeouts, and request-scoped values.

### 1.6 Consistency

**Rule**: Follow existing patterns. Don't introduce new patterns without strong justification.

**Before Writing Code**:
1. Search for similar implementations in the codebase
2. Read existing files in the same package/directory
3. Match naming conventions, file structure, and code style
4. Use existing utility functions instead of creating new ones

---

## 2. Code Generation Rules

### 2.1 Pre-Generation Checklist

**BEFORE generating any code, AI agents MUST**:

1. ✅ Read related files to understand existing patterns
2. ✅ Check for similar implementations in the codebase
3. ✅ Verify file paths and directory structure
4. ✅ Understand the context and requirements fully
5. ✅ Plan the implementation approach
6. ✅ Identify all files that need to be modified

### 2.2 Code Quality Standards

**All generated code MUST**:

- ✅ Compile without errors
- ✅ Follow existing code style and formatting
- ✅ Include appropriate error handling
- ✅ Have proper validation for inputs
- ✅ Include necessary comments for complex logic
- ✅ Use existing utility functions where applicable
- ✅ Match naming conventions of the codebase
- ✅ Be complete (no TODOs unless explicitly requested)

### 2.3 Documentation Standards

**Go Code**:
```go
// CreateUser creates a new user account with the given details.
// It validates the input, hashes the password, and stores the user in the database.
// Returns the created user and an error if validation or creation fails.
func (s *UserService) CreateUser(ctx context.Context, input *CreateUserInput) (*models.User, error) {
    // Implementation
}
```

**TypeScript Code**:
```typescript
/**
 * Creates a new user account
 * @param input - User creation data
 * @returns Promise resolving to the created user
 * @throws {ApiError} If validation fails or API request fails
 */
async function createUser(input: CreateUserInput): Promise<User> {
  // Implementation
}
```

---

## 3. Server (Go) Coding Standards

### 3.1 Naming Conventions

- **Exported**: PascalCase (`UserService`, `CreateUser`, `FindByID`)
- **Unexported**: camelCase (`userRepository`, `validateInput`, `hashPassword`)
- **Constants**: PascalCase with type prefix (`RoleAdmin`, `StatusActive`)
- **Interfaces**: Noun or Noun+er (`UserRepository`, `Validator`, `Hasher`)
- **Files**: snake_case (`user_service.go`, `auth_controller.go`)

### 3.2 Package Organization

```go
// ✅ CORRECT - Group imports
package services

import (
    // Standard library
    "context"
    "fmt"
    "time"

    // External dependencies
    "github.com/google/uuid"
    "gorm.io/gorm"

    // Internal packages
    "github.com/keshablive/quester/internal/models"
    "github.com/keshablive/quester/internal/repositories"
)

// ❌ WRONG - Unorganized imports
package services
import "fmt"
import "github.com/keshablive/quester/internal/models"
import "context"
import "gorm.io/gorm"
```

### 3.3 Function Design

**Rules**:
- Functions should do ONE thing well
- Keep functions short (< 50 lines ideally)
- Use early returns for error cases
- Pass dependencies via constructors, not globals

```go
// ✅ CORRECT - Single responsibility, early returns
func (s *UserService) CreateUser(ctx context.Context, input *CreateUserInput) (*models.User, error) {
    if err := s.validator.Validate(input); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }

    hashedPassword, err := s.hasher.Hash(input.Password)
    if err != nil {
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }

    user := &models.User{
        Email:        input.Email,
        PasswordHash: hashedPassword,
    }

    if err := s.repo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return user, nil
}
```

### 3.4 Database Operations

**Rules**:
- ALWAYS use transactions for multi-table operations
- ALWAYS filter by TenantID
- Use `WithContext(ctx)` for cancellation support
- Handle `gorm.ErrRecordNotFound` explicitly

```go
// ✅ CORRECT - Transaction for multi-table operation
func (s *Service) CreateWithRelations(ctx context.Context, tenantID uuid.UUID, data *Input) error {
    return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // Create main entity
        entity := &models.Entity{TenantID: tenantID, Name: data.Name}
        if err := tx.Create(entity).Error; err != nil {
            return err
        }

        // Create related entities
        for _, rel := range data.Relations {
            related := &models.Related{TenantID: tenantID, EntityID: entity.ID}
            if err := tx.Create(related).Error; err != nil {
                return err
            }
        }

        return nil
    })
}
```

### 3.5 Configuration

**Rules**:
- Load config from environment variables via `godotenv`
- Validate required config on startup
- Use typed config structs, not string maps
- Provide sensible defaults where appropriate

```go
// ✅ CORRECT
type Config struct {
    DatabaseURL string `required:"true"`
    RedisURL    string `required:"true"`
    JWTSecret   string `required:"true"`
    Port        int    `default:"8080"`
}

func LoadConfig() (*Config, error) {
    godotenv.Load()
    
    cfg := &Config{
        DatabaseURL: os.Getenv("DATABASE_URL"),
        RedisURL:    os.Getenv("REDIS_URL"),
        JWTSecret:   os.Getenv("JWT_SECRET"),
        Port:        getEnvInt("PORT", 8080),
    }

    if err := validateConfig(cfg); err != nil {
        return nil, err
    }

    return cfg, nil
}
```

---

## 4. Client (TypeScript) Coding Standards

### 4.1 Naming Conventions

- **Components**: PascalCase (`UserCard`, `LoginForm`, `DashboardPage`)
- **Functions/Variables**: camelCase (`fetchUsers`, `isLoading`, `userData`)
- **Types/Interfaces**: PascalCase (`User`, `CreateUserInput`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRY_COUNT`)
- **Files**: PascalCase for components, camelCase for utilities

### 4.2 Component Structure

```typescript
// ✅ CORRECT - Well-structured component
import { View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { userService } from '@/core/api/services/user.service';
import type { User } from '@/core/types/user';

interface UserCardProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export function UserCard({ userId, onUpdate }: UserCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getById(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (!user) return <Text>User not found</Text>;

  return (
    <Card className="p-4">
      <Text className="text-lg font-bold">{user.name}</Text>
      <Text className="text-gray-600">{user.email}</Text>
    </Card>
  );
}
```

### 4.3 Type Definitions

**Rules**:
- Define interfaces for all props
- Match server response structure exactly
- Use `type` for unions, `interface` for objects
- Export all public types

```typescript
// ✅ CORRECT
export interface User {
  id: string;
  tenant_id: string;
  email: string;
  username: string;
  role: UserRole;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'moderator' | 'instructor' | 'player' | 'partner';

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
}
```

### 4.4 API Service Pattern

```typescript
// ✅ CORRECT - Complete API service
import { apiClient } from '../client';
import type { User, CreateUserInput, UpdateUserInput } from '@/core/types/user';

export const userService = {
  /**
   * Fetches user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/v1/users/${id}`);
    return response.data;
  },

  /**
   * Creates a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const response = await apiClient.post<User>('/api/v1/users', input);
    return response.data;
  },

  /**
   * Updates existing user
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const response = await apiClient.put<User>(`/api/v1/users/${id}`, input);
    return response.data;
  },

  /**
   * Deletes user
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${id}`);
  },

  /**
   * Lists users with pagination
   */
  async list(page: number = 1, limit: number = 20): Promise<User[]> {
    const response = await apiClient.get<User[]>('/api/v1/users', {
      params: { page, limit },
    });
    return response.data;
  },
};
```

### 4.5 State Management Rules

**Rules**:
- Use local state for component-specific data
- Use Context for truly global state (Auth, Theme)
- Avoid prop drilling (use Context if passing through 3+ levels)
- Keep state as close to where it's used as possible

```typescript
// ✅ CORRECT - Local state for component data
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Component-specific logic
}

// ✅ CORRECT - Context for global state
export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### 4.6 Styling Rules

**Rules**:
- Use Tailwind classes via `className` prop
- Avoid inline styles unless dynamic
- Use design system colors and spacing
- Responsive classes: `md:`, `lg:` prefixes

```typescript
// ✅ CORRECT - Tailwind classes
<View className="flex-1 p-4 bg-gray-50">
  <Text className="text-2xl font-bold text-gray-900 mb-4">
    Dashboard
  </Text>
  <Card className="p-6 shadow-lg rounded-xl">
    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
      Click Me
    </Button>
  </Card>
</View>

// ❌ WRONG - Inline styles
<View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
  <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Dashboard</Text>
</View>
```

---

## 5. Testing Standards

### 5.1 Unit Test Rules (Go)

```go
func TestUserService_CreateUser(t *testing.T) {
    // Arrange
    mockRepo := &MockUserRepository{}
    service := NewUserService(mockRepo)
    input := &CreateUserInput{
        Email:    "test@example.com",
        Password: "SecurePass123!",
    }

    // Act
    user, err := service.CreateUser(context.Background(), input)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, input.Email, user.Email)
    assert.NotEmpty(t, user.PasswordHash)
}
```

### 5.2 Component Test Rules (TypeScript)

```typescript
describe('UserCard', () => {
  it('renders user data correctly', async () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    userService.getById = jest.fn().mockResolvedValue(mockUser);

    const { getByText } = render(<UserCard userId="1" />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
    });
  });
});
```

---

## 6. Security Checklist

**Before deploying ANY code**:

- [ ] No sensitive data in logs
- [ ] All inputs validated
- [ ] SQL injection prevented (use GORM properly)
- [ ] XSS prevented (sanitize user content)
- [ ] CSRF tokens on state-changing operations
- [ ] Authentication required on protected routes
- [ ] Authorization checks in place
- [ ] Rate limiting applied
- [ ] Passwords properly hashed
- [ ] Secrets in environment variables, not code
- [ ] HTTPS enforced in production
- [ ] Security headers configured

---

## 7. Performance Rules

### 7.1 Database Performance

- [ ] Indexes on frequently queried columns
- [ ] Indexes include `tenant_id` for multi-tenant queries
- [ ] Use `SELECT` specific columns, not `SELECT *`
- [ ] Pagination for large result sets
- [ ] Connection pooling configured
- [ ] Transactions for multi-table operations only
- [ ] Avoid N+1 queries (use `Preload` or `Joins`)

### 7.2 API Performance

- [ ] Rate limiting on all endpoints
- [ ] Caching for expensive operations
- [ ] Gzip compression enabled
- [ ] Response size kept minimal
- [ ] Lazy loading for large datasets
- [ ] CDN for static assets

---

## 8. Common Anti-Patterns to Avoid

### 8.1 Server Anti-Patterns

❌ **Global variables for state**
```go
var currentUser *models.User // DON'T DO THIS
```

❌ **Ignoring errors**
```go
user, _ := repo.FindByID(id) // DON'T IGNORE ERRORS
```

❌ **Not using context**
```go
func GetUser(id string) {} // Missing context.Context
```

❌ **Hardcoded values**
```go
db.Where("status = 'active'") // Use constants
```

### 8.2 Client Anti-Patterns

❌ **Using any type**
```typescript
const data: any = await fetchData(); // NO
```

❌ **Not handling loading/error states**
```typescript
const [data, setData] = useState(); // Missing loading/error
```

❌ **Prop drilling**
```typescript
<A user={user}>
  <B user={user}>
    <C user={user}> // Use Context instead
```

❌ **Inline styles everywhere**
```typescript
<View style={{flex: 1}}> // Use Tailwind classes
```

---

> **Note**: These rules are mandatory. AI agents that violate these rules will generate incorrect, insecure, or unmaintainable code.
