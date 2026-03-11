---
name: mobile-expo
description: "React Native Expo mobile app development — project setup, navigation (Expo Router), native modules, push notifications, secure storage, app store submission, and mobile-specific patterns. Use whenever building or modifying a React Native or Expo mobile app, creating screens, navigation flows, native integrations, or preparing for iOS/Android store submission. Triggers on: React Native, Expo, mobile app, iOS, Android, app store, screen, navigation, native module, mobile UI, push notification mobile, secure storage, EAS build."
tags: [react-native, expo, mobile, ios, android]
---

# React Native Expo Mobile Development

This skill covers React Native Expo mobile app development for Qualia/GSD workflow projects.

## Project Setup

### Expo SDK 52+
- Always use latest stable Expo SDK (52+)
- TypeScript is mandatory for all projects
- Use Expo Router for file-based routing (like Next.js)
- Configured via `app.json` or `app.config.ts`

### Directory Structure

```
app/
├── (auth)/                    # Protected routes (require authentication)
│   ├── (tabs)/                # Bottom tab navigator (protected)
│   │   ├── home.tsx
│   │   ├── units.tsx
│   │   └── profile.tsx
│   │   └── _layout.tsx        # Tab layout configuration
│   ├── _layout.tsx            # Auth wrapper layout
│   └── [route].tsx            # Catch-all protected route
├── (public)/                  # Unauthenticated screens
│   ├── login.tsx
│   ├── register.tsx
│   ├── verify-otp.tsx
│   └── _layout.tsx
├── _layout.tsx                # Root layout
├── index.tsx                  # Root screen (can redirect)
└── +not-found.tsx            # 404 screen

components/
├── ui/                        # Reusable, unstyled UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Card.tsx
├── forms/                     # Form-specific components
│   ├── LoginForm.tsx
│   ├── OTPForm.tsx
│   └── ProfileForm.tsx
├── auth/                      # Auth-related components
│   ├── ProtectedRoute.tsx
│   └── AuthGuard.tsx
└── [feature]/                 # Feature-specific components
    ├── UnitsCard.tsx
    └── UnitsList.tsx

lib/
├── api/                       # API client layer
│   ├── client.ts              # Axios/fetch with interceptors
│   ├── endpoints.ts           # API endpoint definitions
│   └── schemas.ts             # Zod schemas (shared with backend)
├── auth/                      # Authentication logic
│   ├── context.tsx            # Auth context provider
│   ├── tokens.ts              # Token management
│   └── useAuth.ts             # Auth hook
├── storage/                   # Secure storage wrapper
│   ├── secureStore.ts         # expo-secure-store wrapper
│   └── useSecureStorage.ts    # Custom hook
├── i18n/                      # Internationalization (if needed)
│   └── i18n.ts
├── utils/                     # Helper functions
└── constants.ts               # App-wide constants

hooks/
├── useAuthCheck.ts            # Check if user is authenticated
├── useNavigation.ts           # Type-safe navigation hook
├── useFetch.ts                # Custom hook for API calls
└── useKeyboard.ts             # Keyboard handling

constants/
├── theme.ts                   # Colors, typography, spacing
└── config.ts                  # API base URL, feature flags

assets/
├── icons/
├── images/
└── animations/

App.tsx or app.json            # Entry point configuration
```

## Navigation with Expo Router

### File-Based Routing
- Expo Router uses file system paths as routes
- `app/home.tsx` → `/home` route
- `app/(tabs)/home.tsx` → `/home` with tab layout
- `app/(auth)/profile.tsx` → Protected `/profile` route
- Deep linking is automatic with proper configuration

### Layout Groups
Layout groups with parentheses don't create route segments:
- `(auth)` group shares auth layout without adding to URL
- `(public)` group for unauthenticated screens
- `(tabs)` group for tab navigation within auth group

### Protected Routes Pattern

```tsx
// app/(auth)/_layout.tsx
import { useAuth } from '@/lib/auth/useAuth';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return <Stack />;
}

// app/(auth)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="units" options={{ title: 'Units' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

### Type-Safe Navigation
Create a custom hook for navigation with proper typing:

```tsx
// lib/navigation/useTypedNavigation.ts
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  '/(public)/login': undefined;
  '/(auth)/(tabs)/home': undefined;
  '/(auth)/(tabs)/units': { unitId: string };
  '/(auth)/profile': undefined;
};

export function useTypedNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
```

### Deep Linking
Configure in `app.json`:

```json
{
  "scheme": "sakani",
  "plugins": [
    ["expo-router", {
      "origin": "https://sakani.app"
    }]
  ]
}
```

## API Client Setup

### Centralized API Client

```tsx
// lib/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken } from '@/lib/auth/tokens';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let client: AxiosInstance;

export function createApiClient(): AxiosInstance {
  client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: attach access token
  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor: handle 401 with refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await getRefreshToken();
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          await setAccessToken(data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          // Trigger logout in auth context
          throw refreshError;
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export function getApiClient(): AxiosInstance {
  return client || createApiClient();
}
```

### Endpoint Definitions

```tsx
// lib/api/endpoints.ts
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  UNITS: {
    LIST: '/units',
    GET: (id: string) => `/units/${id}`,
    CREATE: '/units',
    UPDATE: (id: string) => `/units/${id}`,
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
  },
} as const;
```

## Authentication Flow (Mobile)

### Token Management

Access tokens are short-lived (15-30 min) and stored in-memory.
Refresh tokens are long-lived and stored in secure storage.

```tsx
// lib/auth/tokens.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let accessToken: string | null = null;

export async function setTokens(access: string, refresh: string) {
  accessToken = access;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return accessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function initializeTokens() {
  // Called on app start
  // Access token stays in memory, refresh token loaded from secure store
  // Don't restore access token to memory (it expired)
}
```

### Auth Context

```tsx
// lib/auth/context.tsx
import React, { createContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { getApiClient } from '@/lib/api/client';
import { setTokens, clearTokens, getRefreshToken } from './tokens';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string } | null;
  login: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthContextType['user']>(null);

  // Initialize auth on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          await refreshAuth();
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for app foreground (auto-refresh tokens)
  useEffect(() => {
    const subscription = AppState.addEventListener('focus', refreshAuth);
    return () => subscription.remove();
  }, []);

  const login = async (email: string, otp: string) => {
    const api = getApiClient();
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshAuth = async () => {
    try {
      const api = getApiClient();
      const { data } = await api.post('/auth/refresh');
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch {
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### OTP Login Screen

```tsx
// app/(public)/verify-otp.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'expo-router';

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleVerify = async () => {
    try {
      setLoading(true);
      await login('user@example.com', otp); // Email should come from previous screen
      router.replace('/(auth)/(tabs)/home');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Enter OTP</Text>
      <TextInput
        placeholder="000000"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={{ borderWidth: 1, padding: 12, marginBottom: 16 }}
      />
      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading}
        style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Secure Storage

### SecureStore for Sensitive Data

Never use AsyncStorage for tokens or secrets. Use `expo-secure-store`:

```tsx
// lib/storage/secureStore.ts
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800; // SecureStore limit is ~2KB per key

export async function secureSet(key: string, value: string): Promise<void> {
  if (value.length > CHUNK_SIZE) {
    // Chunk large values
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      const chunk = value.substring(i, i + CHUNK_SIZE);
      const chunkKey = `${key}_${Math.floor(i / CHUNK_SIZE)}`;
      await SecureStore.setItemAsync(chunkKey, chunk);
    }
    await SecureStore.setItemAsync(`${key}_chunks`, Math.ceil(value.length / CHUNK_SIZE).toString());
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  const chunks = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunks) {
    let value = '';
    for (let i = 0; i < parseInt(chunks); i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk) value += chunk;
    }
    return value || null;
  }
  return await SecureStore.getItemAsync(key);
}

export async function secureRemove(key: string): Promise<void> {
  const chunks = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunks) {
    for (let i = 0; i < parseInt(chunks); i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
```

## State Management

### React Context (Auth)
Use Context for small, global state like authentication.

### TanStack Query (Server State)
Use React Query for API data caching, refetching, and synchronization:

```tsx
// lib/api/queries.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from './client';

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await getApiClient().get('/units');
      return data;
    },
  });
}

export function useCreateUnit() {
  return useMutation({
    mutationFn: async (unit: any) => {
      const { data } = await getApiClient().post('/units', unit);
      return data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch units list
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
```

### Zustand (Complex Client State)
Use Zustand for complex client state if needed:

```tsx
// lib/store/appStore.ts
import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

## Push Notifications

### Setup with expo-notifications

```bash
npx expo install expo-notifications expo-device
```

### Request Permissions

```tsx
// lib/notifications/index.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function getDeviceToken(): Promise<string | null> {
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

// Register device token with backend
export async function registerDeviceToken(token: string) {
  const api = getApiClient();
  await api.post('/notifications/register', { deviceToken: token });
}
```

### Listen for Notifications

```tsx
// Set default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen in your app
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    // Handle notification tap
    const route = response.notification.request.content.data?.route;
    if (route) {
      router.push(route);
    }
  });

  return () => subscription.remove();
}, []);
```

## Forms with react-hook-form + Zod

```tsx
// lib/api/schemas.ts (shared with backend)
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().min(6, 'OTP must be 6 digits'),
});

export const UnitSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().min(5, 'Address is required'),
  price: z.number().positive('Price must be positive'),
});
```

```tsx
// components/forms/LoginForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/lib/api/schemas';

export function LoginForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(LoginSchema),
  });

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              placeholder="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              style={{ borderWidth: 1, padding: 12, marginBottom: 8 }}
            />
            {errors.email && <Text style={{ color: 'red' }}>{errors.email.message}</Text>}
          </>
        )}
      />
      <TouchableOpacity onPress={handleSubmit(onSubmit)}>
        <Text>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Performance Optimization

### Use FlashList Instead of FlatList

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={units}
  renderItem={({ item }) => <UnitCard unit={item} />}
  keyExtractor={(item) => item.id}
  estimatedItemSize={100}
/>
```

### Image Optimization with expo-image

```tsx
import { Image } from 'expo-image';

<Image
  source={require('@/assets/image.png')}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
  transition={200}
/>
```

### Avoid Re-renders

```tsx
const MemoizedCard = React.memo(({ unit }: { unit: Unit }) => (
  <UnitCard unit={unit} />
));

const handlePress = useCallback(() => {
  navigation.navigate('details', { id });
}, [id, navigation]);
```

### Loading States (Not Spinners)

```tsx
// Use skeleton loaders instead of spinners
<SkeletonLoader height={100} width="100%" count={3} />
```

## Testing

### Unit & Component Tests

```tsx
// Use Jest + React Native Testing Library
import { render, screen } from '@testing-library/react-native';
import { LoginForm } from '@/components/forms/LoginForm';

describe('LoginForm', () => {
  it('renders email input', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  });
});
```

### E2E Tests

Use Detox or Maestro for end-to-end testing on iOS/Android simulators.

## Common Gotchas

### Platform-Specific Code

```tsx
import { Platform } from 'react-native';

// Option 1: Platform check
{Platform.OS === 'ios' && <View>{/* iOS only */}</View>}

// Option 2: Platform extensions
// Button.ios.tsx, Button.android.tsx
// import Button from '@/components/Button'
```

### SafeAreaView for Notch/Dynamic Island

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  {/* Content */}
</SafeAreaView>
```

### Keyboard Handling

```tsx
import { KeyboardAvoidingView } from 'react-native';

<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
  {/* Form content */}
</KeyboardAvoidingView>
```

### Android Back Button

```tsx
useEffect(() => {
  const backAction = () => {
    // Handle back navigation
    return true; // Return true to prevent default behavior
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => backHandler.remove();
}, []);
```

### iOS Swipe-to-Go-Back

```tsx
// Disable in specific screens if needed
useNavigationOptions({
  gestureEnabled: false,
});
```

## Dependencies

### Core
- `expo@52+`
- `expo-router` (file-based navigation)
- `react-native` (via Expo)
- `typescript`

### State & Data
- `@tanstack/react-query`
- `zustand` (optional, for complex client state)

### Forms
- `react-hook-form`
- `@hookform/resolvers`
- `zod`

### API
- `axios`

### Storage
- `expo-secure-store` (tokens, secrets)

### Notifications
- `expo-notifications`
- `expo-device`

### Auth
- `expo-local-authentication` (biometric unlock)

### Images
- `expo-image`

### Lists
- `@shopify/flash-list`

### Testing
- `jest`
- `@testing-library/react-native`
- `detox` or `maestro` (E2E)

### Dev
- `@types/react-native`
- `@types/react`
- `expo-dev-client` (for custom dev builds)

## Quick Start

```bash
npx create-expo-app sakani --template
cd sakani
npx expo install expo-router
npx expo customize tsconfig
npx expo install axios zustand @tanstack/react-query zod react-hook-form @hookform/resolvers
npx expo install expo-secure-store expo-notifications expo-device expo-local-authentication expo-image @shopify/flash-list react-native-safe-area-context

# Create basic structure
mkdir -p app/(auth)/(tabs) app/(public) components/{ui,forms} lib/{api,auth,storage} hooks constants

# Start dev server
npx expo start
```
