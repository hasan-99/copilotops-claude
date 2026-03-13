# Project Template: Mobile App

> React Native + Expo managed workflow + Supabase. Full pipeline from dev to App Store.

**Stack:** React Native, Expo (managed workflow), TypeScript, expo-router, Supabase, EAS Build/Submit
**Phases:** 8
**Type:** mobile-app

## Phases

### Phase 1: Foundation
**Goal:** Working Expo app with TypeScript, navigation, and Supabase connected
**Skills:** [@supabase]
**Tasks:**
- Initialize Expo project with managed workflow and TypeScript strict
- Configure expo-router (file-based routing)
- Set up Supabase client (with @react-native-async-storage for token persistence)
- Configure environment variables (expo-constants, app.config.ts)
- Create tab navigation shell (bottom tabs)
- Set up development build configuration
- Configure ESLint + Prettier for React Native

**Success Criteria:**
1. App runs on iOS simulator and Android emulator
2. Tab navigation works between screens
3. Supabase client connects (test query succeeds)
4. TypeScript strict mode passes

---

### Phase 2: Auth
**Goal:** Complete auth flow with secure token storage and deep linking
**Skills:** [@supabase]
**Tasks:**
- Login screen (email/password)
- Signup screen with email verification
- Password reset flow
- Auth state persistence (AsyncStorage + Supabase session)
- Protected route wrapper (redirect unauthenticated to login)
- Deep linking for email verification and password reset
- Biometric authentication unlock (optional, Face ID / fingerprint)
- Auth loading state (splash → check session → route)

**Success Criteria:**
1. User can sign up, verify email, and log in
2. Session persists across app restarts
3. Deep links from email open correct screen
4. Unauthenticated users always see login screen

---

### Phase 3: Core Screens
**Goal:** Main app screens with data fetching, pull-to-refresh, and CRUD
**Skills:** [@supabase]
**Tasks:**
- Home / dashboard screen with key data
- List screen with FlatList (pagination, pull-to-refresh)
- Detail screen with full resource view
- Create form with validation
- Edit form (pre-populated)
- Delete with confirmation
- Search / filter functionality
- Empty states and error states for all screens
- Loading skeletons

**Success Criteria:**
1. User can perform full CRUD on core resources
2. Lists paginate correctly and pull-to-refresh works
3. Forms validate input and show clear errors
4. Empty states and loading states visible
5. Back navigation works correctly on all flows

---

### Phase 4: Native Features
**Goal:** Platform-specific features: camera, push notifications, location, biometrics
**Skills:** []
**Tasks:**
- Push notifications (expo-notifications + Supabase Edge Function for sending)
- Camera integration (expo-camera or expo-image-picker)
- Location services (expo-location — if applicable)
- Biometric unlock (expo-local-authentication)
- Share functionality (expo-sharing)
- Haptic feedback on key interactions
- Platform-specific UI adjustments (iOS vs Android)
- Permission request flows with clear explanations

**Success Criteria:**
1. Push notifications deliver on both platforms
2. Camera/image picker works and uploads to Supabase Storage
3. Permission requests explain why access is needed
4. Haptic feedback on primary actions

---

### Phase 5: Offline & Performance
**Goal:** Offline-first data with background sync and smooth 60fps UI
**Skills:** []
**Tasks:**
- Local SQLite database (expo-sqlite) for offline cache
- Sync engine: local changes → Supabase when online
- Conflict resolution strategy (last-write-wins or merge)
- Network status detection (NetInfo)
- Optimistic updates (UI updates immediately, sync in background)
- Image caching (expo-image)
- List rendering optimization (FlashList or FlatList tuning)
- Memory profiling and leak detection
- Startup time optimization (reduce bundle, lazy imports)

**Success Criteria:**
1. App works offline for core read/write operations
2. Data syncs when connectivity restored
3. No dropped frames on list scrolling (60fps)
4. App cold start < 2s
5. Memory usage stable over extended use

---

### Phase 6: App Store Prep
**Goal:** App store assets, configuration, and metadata ready for submission
**Skills:** []
**Tasks:**
- App icon (all required sizes for iOS + Android)
- Splash screen (animated or static)
- App Store screenshots (6.7", 6.5", 5.5" for iOS; phone + tablet for Android)
- App Store description, keywords, category
- Privacy policy URL
- app.json / app.config.ts: version, bundle ID, permissions justification
- EAS Build configuration (eas.json: development, preview, production profiles)
- Code signing: Apple Developer certificates, Google Play keystore

**Success Criteria:**
1. App icon renders correctly on both platforms
2. Splash screen displays during load
3. Screenshots capture key features
4. EAS Build config has all 3 profiles
5. Code signing configured for both platforms

---

### Phase 7: Build & Submit
**Goal:** Production builds submitted to App Store Connect and Google Play Console
**Skills:** []
**Tasks:**
- EAS Build: production profile for iOS
- EAS Build: production profile for Android
- Test production builds on physical devices
- EAS Submit to App Store Connect (TestFlight)
- EAS Submit to Google Play Console (internal testing track)
- Fix any submission rejection issues
- TestFlight beta testing round
- Google Play internal testing round

**Success Criteria:**
1. iOS build uploads to App Store Connect without errors
2. Android build uploads to Google Play Console without errors
3. TestFlight build installs and runs on test devices
4. Google Play internal test installs and runs
5. No crash reports from beta testing

---

### Phase 8: Post-Launch
**Goal:** Production monitoring, OTA updates, and crash reporting configured
**Skills:** []
**Tasks:**
- OTA updates: configure expo-updates for instant patches
- Crash reporting (Sentry or expo-updates error tracking)
- Analytics: screen views, key actions, funnel tracking
- App Store listing live: submit for review (iOS), promote to production (Android)
- Monitor first 48h: crash rates, ANR rates, user feedback
- Hotfix process: OTA for JS changes, new build for native changes
- Version bump and changelog for next release

**Success Criteria:**
1. OTA updates deliver to users within minutes
2. Crash reports appear in dashboard with stack traces
3. Analytics tracking key user flows
4. App live on both stores
5. No critical crashes in first 48h
6. Hotfix pipeline tested and documented
