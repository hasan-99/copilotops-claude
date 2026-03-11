# App Store & Play Store Submission Checklist

Comprehensive checklist for submitting React Native Expo apps to Apple App Store (iOS) and Google Play Store (Android).

## Pre-Submission (General)

### Project Configuration
- [ ] App name is finalized (check both stores for availability)
- [ ] Bundle ID (iOS) and Package name (Android) are unique and follow reverse-domain format
  - iOS: `com.company.appname`
  - Android: `com.company.appname`
- [ ] Version number follows semantic versioning (e.g., 1.0.0)
- [ ] Build number incremented for each submission (e.g., build 1, 2, 3)
- [ ] TypeScript strict mode enabled
- [ ] All console warnings and errors resolved
- [ ] No hardcoded API endpoints or secrets in code
- [ ] Production API endpoints configured via environment variables
- [ ] Analytics and error tracking (Sentry, etc.) configured for production

### EAS Build Configuration

Create `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "preview2": {
      "android": {
        "gradleCommand": ":app:assembleRelease"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  },
  "submit": {
    "production": {
      "ios": true,
      "android": true
    }
  }
}
```

Update `app.json`:

```json
{
  "expo": {
    "name": "App Name",
    "slug": "app-name",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.company.appname",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.company.appname",
      "versionCode": 1
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

---

## iOS App Store

### Apple Developer Account
- [ ] Apple Developer Program account created and paid ($99/year)
- [ ] Bundle ID registered in Apple Developer portal
- [ ] App ID created with correct bundle ID
- [ ] Signing certificate created (development and production)
- [ ] Provisioning profiles generated (development and distribution)
- [ ] EAS Build has access to Apple credentials (run `eas build --platform ios`)

### Required Assets

#### App Icon
- [ ] Icon size: 1024x1024 px (PNG)
- [ ] No transparency (solid background)
- [ ] Placed at `assets/icon.png`
- [ ] High quality, clear design visible at small sizes
- [ ] Follows Apple's app icon guidelines (no text, simple shapes)

#### Splash Screen
- [ ] Size: 1242x2688 px (portrait, standard iPhone)
- [ ] Placed at `assets/splash.png`
- [ ] Contains minimal branding, no app store information
- [ ] Loading screen strategy: show splash → load → show main content

#### Screenshots
- [ ] At least one screenshot for each device size:
  - iPhone 5.5-inch (e.g., iPhone XS Max)
  - iPad 12.9-inch (if supporting iPad)
- [ ] Minimum 3 screenshots per locale
- [ ] Recommended 5 screenshots showing key features
- [ ] Screenshots must be actual in-app content, not marketing materials
- [ ] Include text overlay explaining key features (optional but recommended)
- [ ] Screenshot dimensions:
  - 1242x2208 px (5.5-inch iPhone)
  - 2048x2732 px (12.9-inch iPad)

#### Preview Video
- [ ] Optional but increases visibility
- [ ] 15-30 seconds long
- [ ] Demonstrates core features
- [ ] Video format: QuickTime, MP4
- [ ] Max 500 MB

### App Information

#### Metadata
- [ ] App Name: Clear, concise (30 characters max)
- [ ] Subtitle: Short description (30 characters max)
- [ ] Description: Compelling feature list (4,000 characters max)
- [ ] Keywords: Comma-separated, relevant search terms (100 characters max)
- [ ] Support URL: Working URL to support page
- [ ] Privacy Policy URL: Required, must be accessible
- [ ] Category: Select most relevant category
- [ ] Age Rating: Fill out App Store questionnaire honestly

#### Privacy & Permissions
- [ ] Privacy Policy clearly explains:
  - What data is collected
  - How data is used
  - Who data is shared with
  - User rights (access, deletion)
- [ ] Request permissions with justification:
  ```
  **Camera**: "To take photos of properties"
  **Location**: "To show nearby units and properties"
  **Contacts**: "To invite friends"
  **Photos**: "To upload property images"
  **Notifications**: "To notify you of new listings"
  ```
- [ ] Add permission usage descriptions in `Info.plist`:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>To take photos of properties</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>To show nearby units and properties</string>
  ```

#### Ratings & Age
- [ ] Accurate age rating (Parental Guidance, 12+, 17+, etc.)
- [ ] Fill out entire IARC questionnaire
- [ ] No misleading content ratings

### Technical Requirements

#### Performance
- [ ] App launches in < 20 seconds on iPhone 6s
- [ ] Memory usage reasonable (no crashes due to leaks)
- [ ] Battery usage optimized (no excessive CPU/network)
- [ ] Handles network failures gracefully
- [ ] Offline mode considered or message shown

#### Functionality
- [ ] All features work as described
- [ ] No broken links
- [ ] Forms submit successfully
- [ ] Authentication flow complete
- [ ] No placeholder text in production
- [ ] Loading states visible
- [ ] Error messages helpful and user-facing

#### Design & UX
- [ ] Uses native iOS UI components where appropriate
- [ ] Respects Safe Area for notch/dynamic island
- [ ] Keyboard doesn't cover input fields
- [ ] Touch targets minimum 44x44 pt
- [ ] Text is readable (min 11pt for body text)
- [ ] Supports Dark Mode or declares light-only
- [ ] No misleading UX (e.g., fake close buttons)

#### Navigation
- [ ] Back button/gesture works as expected
- [ ] Navigation hierarchy is logical
- [ ] Tab bar visible and functional
- [ ] Deep links work (if supported)

### Common Rejection Reasons

| Issue | Fix |
|-------|-----|
| App crashes on startup | Debug with TestFlight beta, check iOS compatibility |
| Incomplete metadata | Fill all required fields, ensure correct language |
| Privacy policy missing | Add URL, ensure policy covers all collected data |
| Excessive ads/pop-ups | Reduce ad frequency, only show relevant ads |
| External payment links | Use In-App Purchase for all payments, not external links |
| No app functionality | Ensure core features work without account required |
| Outdated API usage | Update to latest iOS SDK (Expo 52+) |
| Not optimized for iPhone | Test on actual iPhone, not just simulators |
| Downloaded content uncached | Cache downloaded data, don't re-download unnecessarily |

### Submission Process

```bash
# Build for App Store
eas build --platform ios --auto-submit false

# Or auto-submit to TestFlight/App Store
eas build --platform ios --auto-submit
eas submit --platform ios

# Manual submission via Xcode or App Store Connect
```

---

## Android Play Store

### Google Play Account
- [ ] Google Play Developer account created and paid ($25 one-time)
- [ ] Google Play Console access granted
- [ ] Package name registered and unique
- [ ] Keystore created and backed up securely
  ```bash
  keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```
- [ ] EAS Build has access to keystore (run `eas build --platform android`)

### Required Assets

#### App Icon
- [ ] Icon size: 512x512 px (PNG)
- [ ] No transparency (solid background)
- [ ] Placed at `assets/icon.png`
- [ ] Clear at small sizes
- [ ] Follows Android Material Design guidelines

#### Adaptive Icon (Android 8+)
- [ ] Foreground: 108x108 px with 72x72 px safe zone (no transparency)
- [ ] Background: Solid color or simple shape
- [ ] Placed at `assets/adaptive-icon.png`

#### Splash Screen
- [ ] Size: 1080x1920 px (portrait)
- [ ] For Android 12+, use Material 3 splash screen API
- [ ] Minimal branding, fast loading

#### Screenshots
- [ ] At least 2 screenshots required
- [ ] Recommended 5 screenshots showing features
- [ ] Device configurations:
  - 1080x1920 px (phone)
  - 1200x1920 px (phone 7-inch)
  - 1600x2560 px (tablet 10-inch)
- [ ] Screenshots must show actual app content
- [ ] Text overlays explaining features recommended

### App Information

#### Metadata
- [ ] App Name: Clear, concise (50 characters max)
- [ ] Short Description: Engaging summary (80 characters)
- [ ] Full Description: Features, benefits (4,000 characters)
- [ ] Promoted Genre: Select most relevant
- [ ] Category: e.g., "Lifestyle", "Shopping", "Finance"
- [ ] Contact Email: Support email address
- [ ] Website: Company/app website URL
- [ ] Privacy Policy URL: Required and accessible
- [ ] Preferred Language: Select primary language

#### Privacy & Permissions
- [ ] Privacy Policy accessible, explains:
  - Data collection practices
  - Data storage and security
  - Data sharing with third parties
  - User rights and choices
- [ ] Declare all permissions in manifest:
  ```xml
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  ```
- [ ] Request runtime permissions with rationale:
  ```tsx
  const { status } = await requestPermission('camera');
  if (status !== 'granted') {
    Alert.alert('Permission required for camera access');
  }
  ```
- [ ] Target API Level 34 (Android 14) minimum
- [ ] Accurate Data Safety declaration (Google Play requirement as of 2024)

#### Content Rating
- [ ] Complete Google Play content rating questionnaire
- [ ] Honest answers about app content
- [ ] Rating determines visibility to age groups

### Technical Requirements

#### Performance
- [ ] App launches in < 5 seconds on Pixel 4a (slower device)
- [ ] Works on Android 8.0+ (minSdkVersion: 26)
- [ ] Optimized for various screen sizes (4.5" to 6.7")
- [ ] Tablet layout support (if claiming tablet compatibility)
- [ ] No native crashes
- [ ] Memory usage < 250 MB

#### Functionality
- [ ] All features work as advertised
- [ ] No broken functionality
- [ ] Forms submit and validate properly
- [ ] Network failures handled gracefully
- [ ] Loading states visible
- [ ] No placeholder/debug content
- [ ] Back button navigates correctly

#### Design & UX
- [ ] Uses Material 3 design principles
- [ ] Respects safe areas (notches, gesture buttons)
- [ ] Keyboard handling (doesn't hide inputs)
- [ ] Touch targets 48x48 dp (48 density-independent pixels)
- [ ] Text readable (minimum 14sp)
- [ ] Dark mode support or explicit light-only declaration
- [ ] Proper use of system colors and spacing

#### Targeting & Compatibility
- [ ] Works on various screen sizes (phones and tablets)
- [ ] Landscape and portrait orientations supported
- [ ] No orientation lock unless justified
- [ ] Works with and without Google Play Services

### Data Safety Form

Required as of March 2024. Declare:

- [ ] Data types collected (location, contacts, identifiers, etc.)
- [ ] Data usage (analytics, personalization, etc.)
- [ ] Data sharing with third parties
- [ ] Data encryption in transit and at rest
- [ ] Data retention policies
- [ ] User deletion rights
- [ ] Third-party SDK data practices

Common data types for typical app:
```
• Email: Authentication, customer support
• User ID: App functionality
• Location: Map features, nearby search
• Photos/videos: Profile, content creation
• Device identifiers: Analytics, crash reporting
```

### Common Rejection Reasons

| Issue | Fix |
|-------|-----|
| Unsafe content | Review and remove inappropriate material |
| Broken functionality | Test all features work on actual devices |
| Incomplete metadata | Fill all required fields accurately |
| Missing privacy policy | Add privacy policy link, ensure content matches declaration |
| Incorrect targeting | Declare minimum SDK correctly, test on older devices |
| Excessive permissions | Only request permissions needed for features |
| Deceptive behavior | No misleading ads, hidden functionality, or dark patterns |
| Impersonation | Don't use brand names you don't own |
| Payment issues | Use Google Play Billing, not external payment |
| Outdated Google Play Services | Update to latest; test authentication, maps, etc. |
| Missing crash handling | Implement global error boundaries, crash reporting |

### Submission Process

```bash
# Build for Play Store
eas build --platform android

# Auto-submit to Play Console
eas submit --platform android

# Manual submission via Google Play Console
# Upload APK/AAB, fill metadata, submit for review
```

---

## Pre-Submission Testing

### Device Testing
- [ ] iPhone (latest): iOS latest version
- [ ] iPhone (older): iOS 14+ minimum
- [ ] Android (flagship): Android 14
- [ ] Android (budget): Android 8-10
- [ ] Tablet: iPad and Android tablet
- [ ] Different networks: WiFi, LTE, 3G (slow network)
- [ ] Offline mode: App gracefully handles no connectivity

### Scenarios to Test
- [ ] First-time user setup/onboarding
- [ ] Login and authentication
- [ ] Main features and user flows
- [ ] Navigation and deep linking
- [ ] Form validation and submission
- [ ] Payment/transactions (if applicable)
- [ ] Push notifications (if enabled)
- [ ] Location services (if used)
- [ ] Biometric authentication (if enabled)
- [ ] Logout and session expiration
- [ ] Reinstall and data restoration
- [ ] Restore from backup
- [ ] Permission requests and denials
- [ ] Background app refresh (if applicable)

### App Store Test Flight
- [ ] Submit build to TestFlight
- [ ] Invite internal testers (team)
- [ ] Collect feedback for 1-2 weeks minimum
- [ ] Fix reported issues
- [ ] Test analytics and crash reporting
- [ ] Verify analytics tracking correctly

### Google Play Internal Testing
- [ ] Upload to internal test track
- [ ] Invite internal testers
- [ ] Test for minimum 7 days
- [ ] Monitor crash reports and ANRs
- [ ] Fix issues, bump build number
- [ ] Move to closed/open beta when confident
- [ ] Monitor feedback, reviews, crashes
- [ ] Iterate if needed

---

## Post-Submission

### After Approval
- [ ] Monitor crash logs and error reports daily first week
- [ ] Respond to user reviews promptly
- [ ] Fix critical bugs with hotfix builds
- [ ] Plan updates with meaningful changes
- [ ] Maintain changelog and release notes

### Update Guidelines
- [ ] Version number increments: major.minor.patch
- [ ] Build number always increments
- [ ] Release notes explain changes in user-friendly terms
- [ ] Test updates on multiple devices before submitting
- [ ] Plan for 1-7 day app store review time

### Analytics & Monitoring
- [ ] Set up Sentry or similar crash reporting
- [ ] Monitor API error rates
- [ ] Track user engagement metrics
- [ ] Monitor app size and performance metrics
- [ ] Alert on crashes or critical errors

---

## OTA Updates with EAS Update

After initial app store release, use EAS Update for faster JS-only updates:

```bash
# Publish JS-only update (not requiring app store review)
eas update --branch production

# View recent updates
eas update list

# Rollback if needed
eas update rollback --branch production
```

Benefits:
- Update within hours (not days)
- No app store review
- Immediate impact on all users
- Cheaper than full app rebuilds

Limitations:
- Only JS/assets changes (not native changes)
- Must have published base build first
- OTA should only include safe changes

---

## Checklist Validation

Before submitting to app stores:

```bash
# 1. Validate app.json and eas.json
npx eas build --dry-run --platform ios
npx eas build --dry-run --platform android

# 2. Test build locally
npx expo start --dev-client

# 3. Run tests
npm run test

# 4. Check bundle size
npx expo export --output-dir dist

# 5. Lint and format
npm run lint
npm run format
```

Use this checklist at submission time:

- [ ] All app store assets prepared
- [ ] Metadata finalized and accurate
- [ ] Privacy policy published and accessible
- [ ] All permissions justified and declared
- [ ] Build number incremented
- [ ] Version number updated
- [ ] No console warnings or errors
- [ ] Tested on physical devices (iOS and Android)
- [ ] TestFlight/internal testing completed
- [ ] Screenshots and descriptions uploaded
- [ ] OTA update strategy planned
- [ ] Monitoring and crash reporting configured
- [ ] Support contact information accurate
- [ ] Legal documents (privacy, terms) in place
- [ ] Ready to submit
