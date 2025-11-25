# Quester Agent Helper: Client (React Native/Expo)

> **Purpose:** This guide provides the strict patterns and snippets required when modifying the Quester frontend.
> **Context:** `client/` directory. React Native 0.79+, Expo 53, NativeWind v4.

## 1. Component Pattern
**Strictly follow:** `ScreenWrapper` -> `View` -> `Components`

### 1.1 Screen Structure (`app/(tabs)/*.tsx`)
- **Wrapper:** ALWAYS wrap screens in `<ScreenWrapper>`.
- **Performance:** ALWAYS use `useScreenPerformanceMetrics('ScreenName')`.
- **Styling:** Use `className` (NativeWind).

**Snippet: New Screen**
```tsx
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function NewScreen() {
  useScreenPerformanceMetrics('NewScreen');

  return (
    <ScreenWrapper screenName="NewScreen">
      <View className="flex-1 bg-background p-4">
        <Text variant="h1">Title</Text>
      </View>
    </ScreenWrapper>
  );
}
```

### 1.2 UI Components (`components/ui/*.tsx`)
- **Library:** Use `React Native Reusables` (shadcn/ui port).
- **Imports:** Import from `@/components/ui/...`.
- **Icons:** Use `lucide-react-native` via `Icon` component.

## 2. API Integration
**Pattern:** `apiClient` -> `FeatureAPI` -> `useFeature` Hook -> Component

### 2.1 API Class (`lib/api/*.ts`)
- Extend `apiClient` usage.
- Return typed Promises.

**Snippet: New API Method**
```typescript
import { apiClient } from './client';

export const featureAPI = {
  getItems: async (page = 1) => {
    return await apiClient.get(\`/items?page=\${page}\`);
  },
  createItem: async (data: CreateItemRequest) => {
    return await apiClient.post('/items', data);
  }
};
```

### 2.2 Custom Hook (`lib/hooks/*.ts`)
- Wrap API calls.
- Handle loading/error states.

**Snippet: New Hook**
```typescript
export function useFeature() {
  const [loading, setLoading] = useState(false);

  const createItem = useCallback(async (data) => {
    setLoading(true);
    try {
      await featureAPI.createItem(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createItem, loading };
}
```

## 3. Styling (NativeWind)
- **File:** `tailwind.config.js` defines theme.
- **Colors:** Use semantic names: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`.
- **Spacing:** Standard Tailwind spacing (`p-4`, `m-2`).

## 4. Navigation (Expo Router)
- **Push:** `router.push('/path')`
- **Replace:** `router.replace('/path')`
- **Params:** `router.push({ pathname: '/path', params: { id: '123' } })`

## 5. Performance Rules
1.  **Lists:** ALWAYS use `FlatList` with `removeClippedSubviews` and `getItemLayout` for long lists.
2.  **Images:** Use `Expo Image` for caching.
3.  **Memoization:** Use `useCallback` for handlers passed to children.
