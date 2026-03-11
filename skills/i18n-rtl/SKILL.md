---
name: i18n-rtl
description: "Internationalization and RTL (Right-to-Left) layout patterns — Arabic/English bilingual apps, RTL CSS/Tailwind, message key systems, locale switching, numeral handling, date/time formatting, and bidirectional text. Use whenever implementing multi-language support, Arabic UI, RTL layouts, translation systems, or locale-aware formatting in web or mobile apps. Triggers on: i18n, internationalization, RTL, right-to-left, Arabic, translation, locale, language switching, bilingual, message keys, متعدد اللغات."
tags: [i18n, rtl, arabic, localization]
---

# Internationalization & RTL (Right-to-Left) Layout Patterns

This skill covers Arabic/English bilingual application design—message key architectures, RTL layout strategies, locale detection, numeral display, date/time formatting, and bidirectional text handling.

## Core Architecture

### Message Key System

All user-facing strings must use message keys. No hardcoded text anywhere—this enables translation, consistency, and independent text updates without code changes.

**Backend Contract:**
- Backend returns only message keys and structured data
- Never return display text from the server
- Include all context needed for plural/conditional rendering

**Frontend Resolution:**
- React context or hooks resolve keys → localized strings
- Fallback chain: user locale → default locale (ar) → key itself

**Key Naming Convention:**

```typescript
// In @sakani/shared or dedicated i18n package
// Dot-notation, grouped by domain and entity
const translations = {
  ar: {
    // Building domain
    'building.name': 'اسم المبنى',
    'building.type.residential': 'سكني',
    'building.type.commercial': 'تجاري',
    'building.label.floorNumber': 'رقم الطابق',

    // Error domain (all error codes → message keys)
    'error.auth.unauthenticated': 'يرجى تسجيل الدخول',
    'error.auth.forbidden': 'ليس لديك صلاحيات كافية',
    'error.validation.required': 'هذا الحقل مطلوب',
    'error.validation.emailInvalid': 'البريد الإلكتروني غير صحيح',

    // Dues domain (reason codes → message keys)
    'dues.status.paid': 'مدفوع',
    'dues.status.unpaid': 'غير مدفوع',
    'dues.status.late': 'متأخر',
    'dues.reason.regularExpense': 'مصروف منتظم',
    'dues.reason.specialAssessment': 'تقييم خاص',

    // Action domain
    'action.create': 'إنشاء',
    'action.update': 'تحديث',
    'action.delete': 'حذف',
    'action.save': 'حفظ',
    'action.cancel': 'إلغاء',
  },
  en: {
    'building.name': 'Building Name',
    'building.type.residential': 'Residential',
    'building.type.commercial': 'Commercial',
    'building.label.floorNumber': 'Floor Number',

    'error.auth.unauthenticated': 'Please sign in',
    'error.auth.forbidden': 'You do not have permission',
    'error.validation.required': 'This field is required',
    'error.validation.emailInvalid': 'Email address is invalid',

    'dues.status.paid': 'Paid',
    'dues.status.unpaid': 'Unpaid',
    'dues.status.late': 'Late',
    'dues.reason.regularExpense': 'Regular Expense',
    'dues.reason.specialAssessment': 'Special Assessment',

    'action.create': 'Create',
    'action.update': 'Update',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
  }
};
```

**Naming Pattern:**
- `{domain}.{entity}.{property}` — for attributes/labels
- `{domain}.{action}.{context}` — for operations/statuses
- All error codes map 1:1 to a message key
- All reason/status codes are message keys, not magic strings

### Locale Detection & Persistence

**Priority Order:**
1. User preference (profile setting, synced across devices)
2. Device locale (from OS settings)
3. Default: `ar` (Arabic)

**Persistence:**
- Web: localStorage + server user profile
- Mobile: AsyncStorage + server user profile
- On app load: fetch user preference from profile (source of truth)
- On logout: fall back to device locale
- Offline: use last known preference from device storage

## RTL Layout — Web (Tailwind CSS)

### Setup

Install and configure `tailwindcss-rtl` plugin:

```bash
npm install tailwindcss-rtl
```

```javascript
// tailwind.config.js
module.exports = {
  plugins: [require('tailwindcss-rtl')],
};
```

### Logical Properties (Not Physical)

Use Tailwind's logical property system—`start`/`end` instead of `left`/`right`, which automatically flip based on text direction.

**Examples:**

| Use | Don't Use | When RTL |
|-----|-----------|---------|
| `ms-4` | `ml-4` | becomes `margin-right` |
| `ps-8` | `pl-8` | becomes `padding-right` |
| `text-start` | `text-left` | becomes `text-right` |
| `float-start` | `float-left` | becomes `float-right` |
| `rounded-s-lg` | `rounded-l-lg` | becomes `rounded-r-lg` |
| `border-s-2` | `border-l-2` | becomes `border-r-2` |
| `inset-s-0` | `inset-l-0` | becomes `inset-r-0` |

**Complete Example:**

```jsx
// Header with logo (start) and menu button (end)
<header className="flex items-center justify-between p-4">
  <div className="w-10 h-10">Logo</div>
  <button>Menu</button>
</header>

// Sidebar layout — flex-col on mobile, row on desktop
// RTL: flex-row-reverse flips the sidebar to the right
<div className="flex flex-col md:flex-row md:rtl:flex-row-reverse gap-4">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>

// List with icon (left in LTR, right in RTL)
<li className="flex items-center gap-3">
  <span className="text-xl">✓</span>
  <span>Item text</span>
</li>

// Input with icon inside
<div className="relative">
  <input className="ps-10 pe-4" type="text" />
  <span className="absolute inset-s-0 flex items-center ps-3">🔍</span>
</div>
```

### Root Element & Direction

Set `dir` attribute on the root element:

```jsx
// In your layout wrapper or _app.tsx
import { useLocale } from '@/hooks/useLocale';

export default function App({ Component, pageProps }) {
  const { locale } = useLocale();

  return (
    <html dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <Component {...pageProps} />
      </body>
    </html>
  );
}
```

Or with Next.js `next-intl`:

```jsx
import { useLocale } from 'next-intl';

export default function RootLayout({ children }) {
  const locale = useLocale();

  return (
    <html dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      {children}
    </html>
  );
}
```

### RTL-Specific Overrides

Use the `rtl:` variant for RTL-only styles:

```jsx
// Icon that should point right in LTR, left in RTL
<svg className="w-4 h-4 rtl:rotate-180">
  <use href="#arrow-right" />
</svg>

// Navigation arrow that reverses in RTL
<button className="flex items-center gap-2 rtl:flex-row-reverse">
  <span>Next</span>
  <ChevronRight className="w-4 h-4" />
</button>

// Grid that becomes single column in RTL (depends on layout)
<div className="grid grid-cols-3 gap-4 rtl:grid-cols-1">
  ...
</div>
```

### Icons & Graphics

Icons need manual flipping in RTL. Common ones to flip:

- Chevrons / arrows (right, left)
- Play buttons (play, pause, skip)
- Notifications (bell, envelope)
- Checkmarks / close icons (usually symmetric, no flip)

**Implementation:**

```jsx
import { useLocale } from '@/hooks/useLocale';

function ChevronRight() {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  return (
    <svg className={isRTL ? 'rotate-180' : ''}>
      <path d="M9 5l5 7-5 7" />
    </svg>
  );
}

// Or use a utility:
function DirectionalIcon({ children, icon }) {
  const { locale } = useLocale();
  return locale === 'ar' && icon.flipsInRTL ? (
    <span className="inline-block rotate-180">{children}</span>
  ) : (
    children
  );
}
```

## RTL Layout — React Native

### Forced RTL Mode

```typescript
import { I18nManager } from 'react-native';
import { useLocale } from '@/hooks/useLocale';

// In app initialization / locale context
export function useRTL() {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  useEffect(() => {
    I18nManager.forceRTL(isRTL);
    // Note: May require app reload on some platforms
  }, [isRTL]);

  return isRTL;
}

// Check current RTL state
const isCurrentlyRTL = I18nManager.isRTL;
```

### Layout Patterns

```typescript
import { StyleSheet, View, Text, I18nManager } from 'react-native';

const styles = StyleSheet.create({
  // Use logical properties where possible
  container: {
    paddingStart: 16,
    paddingEnd: 16,
  },

  // Flip flex direction for RTL
  row: {
    flexDirection: 'row',
  },
  rowReverse: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },

  // Text alignment
  textStart: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  textEnd: {
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
});

// Component with RTL awareness
function Header() {
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Text>Title</Text>
      <Icon
        name={isRTL ? 'chevron-left' : 'chevron-right'}
        size={24}
      />
    </View>
  );
}
```

### TextInput & Text Direction

```typescript
<TextInput
  style={{ textAlign: I18nManager.isRTL ? 'right' : 'left' }}
  writingDirection={I18nManager.isRTL ? 'rtl' : 'ltr'}
  placeholder="Type here..."
/>
```

## Numeral Display

**Rule: Always display Western Arabic numerals (0–9), never Eastern Arabic (٠–٩).**

Even in Arabic locale, use `0-9`. This applies to:
- Prices: `1,234.56`
- Quantities: `12`
- Dates: `2025-03-06`
- Phone numbers: `+962 6 123 4567`

**Implementation:**

```typescript
// Correct: Western numerals in Arabic
const formatter = new Intl.NumberFormat('ar-JO');
formatter.format(1234); // → "1,234"

// Correct: Using date-fns (automatically handles numerals)
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
format(new Date(), 'd/M/yyyy', { locale: ar }); // → "06/03/2025"

// Avoid: Eastern Arabic numerals
// ❌ "١٢٣٤" — don't display this in UI
```

## Date & Time Formatting

### Storage & Timezone

- **Store:** Always UTC in the database
- **Display:** Asia/Amman timezone (Jordan local time)
- **Format:** Use `Intl.DateTimeFormat` or `date-fns` with locale

### Implementation

```typescript
import { format } from 'date-fns';
import { ar, en } from 'date-fns/locale';

function formatDate(isoDate: string, locale: 'ar' | 'en') {
  const date = new Date(isoDate);

  if (locale === 'ar') {
    return format(date, 'd MMMM yyyy', { locale: ar });
    // → "06 مارس 2025"
  }

  return format(date, 'd MMMM yyyy', { locale: en });
  // → "6 March 2025"
}

// Or with Intl.DateTimeFormat
function formatDateIntl(isoDate: string, locale: 'ar' | 'en') {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Amman',
  }).format(date);
}

// Time with timezone awareness
function formatTime(isoDate: string, locale: 'ar' | 'en') {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Amman',
  }).format(date);
}
```

### Date Formats by Locale

- **Arabic:** `DD/MM/YYYY` — `06/03/2025`
- **English:** `DD/MM/YYYY` or `MM/DD/YYYY` depending on region
- Always use locale-aware formatters, don't hardcode

## Currency Formatting

### Jordan Dinar (JOD)

- **Currency Code:** JOD
- **Decimal Places:** 3
- **Decimal Separator:** `.` (universal) or `٫` (Arabic specific)
- **Symbol Position:** After amount in Arabic, before in English

### Implementation

```typescript
function formatCurrency(amount: number, locale: 'ar' | 'en') {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  return formatter.format(amount);
  // ar: "12٫000 د.أ"
  // en: "JOD 12.000"
}

// Manual formatting with custom formatting
function formatCurrencyCustom(amount: number, locale: 'ar' | 'en') {
  const numStr = amount.toFixed(3);
  const symbol = 'د.أ'; // JOD symbol

  if (locale === 'ar') {
    return `${numStr} ${symbol}`;
  }

  return `JOD ${numStr}`;
}
```

## Locale Switching

### User Preference Flow

1. **On App Load:**
   - Fetch user profile (includes locale preference)
   - If missing, use device locale
   - If not ar/en, default to ar

2. **User Changes Language:**
   - Update user profile (API call)
   - Update local context/state
   - Update UI direction (`dir` attribute or `I18nManager.forceRTL`)
   - Reload component tree or update i18n library

3. **Persistence:**
   - Web: localStorage + server (server is source of truth)
   - Mobile: AsyncStorage + server (server is source of truth)

### Implementation

```typescript
// useLocale hook
import { createContext, useContext, useState, useEffect } from 'react';

const LocaleContext = createContext<{
  locale: 'ar' | 'en';
  setLocale: (locale: 'ar' | 'en') => Promise<void>;
}>(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState<'ar' | 'en'>('ar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user profile on mount
    async function initLocale() {
      try {
        const profile = await fetchUserProfile();
        const userLocale = profile.locale || 'ar';
        setLocaleState(userLocale);

        // Apply to DOM/RN
        if (typeof document !== 'undefined') {
          document.documentElement.dir = userLocale === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = userLocale;
        }
      } catch (err) {
        // Fallback to device locale
        setLocaleState('ar');
      } finally {
        setLoading(false);
      }
    }

    initLocale();
  }, []);

  const setLocale = async (newLocale: 'ar' | 'en') => {
    try {
      // Update server
      await updateUserProfile({ locale: newLocale });

      // Update local state
      setLocaleState(newLocale);

      // Update DOM
      if (typeof document !== 'undefined') {
        document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLocale;
      }

      // Persist to device storage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('locale', newLocale);
      }
    } catch (err) {
      console.error('Failed to change locale:', err);
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {!loading && children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}
```

## Bidirectional Text

### Mixed-Direction Content

When Arabic and English text mix (e.g., product names, brand names), use Unicode bidirectional formatting to prevent visual corruption.

**Example Problem:**
```
Arabic: "اسم المنتج Product Name"
       (text-align changes based on first character)
```

**Solution: Use `<bdi>` tag or Unicode Isolates**

```jsx
// Automatically isolate direction
<p>الشركة: <bdi>Apple Inc.</bdi></p>
// → "الشركة: Apple Inc." (email correct)

// Or with span and dir attribute
<span dir="auto">مرحبا Hello</span>
// → Direction auto-detected from content

// Unicode isolates (lowest-level)
<p>{'الشركة: \u2066' + 'Apple Inc.' + '\u2069'}</p>
// \u2066 = LRI (Left-to-Right Isolate)
// \u2069 = PDI (Pop Directional Isolate)
```

### Phone Numbers, Emails, URLs (Always LTR)

```jsx
// Phone number in RTL context — always LTR
<p>
  الهاتف: <span dir="ltr">+962 6 123 4567</span>
</p>

// Email address
<a href="mailto:user@example.com" dir="ltr">
  user@example.com
</a>

// URL in Arabic text
<p>
  زيارة الموقع: <span dir="ltr">https://example.com</span>
</p>
```

### User-Generated Content

For text from users (comments, descriptions), use `<bdi>` to auto-detect direction:

```jsx
function UserComment({ text, locale }) {
  return (
    <div className={locale === 'ar' ? 'text-right' : 'text-left'}>
      <bdi>{text}</bdi>
      {/* Auto-detects whether text is RTL or LTR */}
    </div>
  );
}
```

## Common Mistakes & How to Avoid

### 1. Using Physical Properties Instead of Logical

```jsx
// ❌ Wrong: Text will be on the wrong side in RTL
<div className="ml-4 float-left">Content</div>

// ✓ Correct: Automatically flips in RTL
<div className="ms-4 float-start">Content</div>
```

### 2. Forgetting to Flip Icons

```jsx
// ❌ Wrong: Arrow always points right
<button>
  Next <ChevronRight />
</button>

// ✓ Correct: Icon flips based on locale
function NextButton() {
  const { locale } = useLocale();
  return (
    <button className={locale === 'ar' ? 'flex-row-reverse' : ''}>
      Next
      <ChevronRight className={locale === 'ar' ? 'rotate-180' : ''} />
    </button>
  );
}
```

### 3. Testing with Latin Placeholders Hides RTL Bugs

```
❌ "Lorem ipsum" in RTL container looks correct
✓ "مرحبا بك" (Arabic) immediately reveals direction issues
```

**Always test with actual Arabic text**, not Lorem Ipsum.

### 4. Hardcoding Text Alignment

```jsx
// ❌ Wrong: Alignment is fixed regardless of direction
<h1 style={{ textAlign: 'left' }}>Title</h1>

// ✓ Correct: Flips based on locale
<h1 className="text-start">Title</h1>
// or
<h1 style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>Title</h1>
```

### 5. Not Isolating Mixed-Direction Content

```jsx
// ❌ Wrong: "Product Name" gets pulled to the wrong side
<p>المنتج: Product Name</p>

// ✓ Correct: Uses bidirectional isolation
<p>المنتج: <bdi>Product Name</bdi></p>
```

### 6. Using Eastern Arabic Numerals (٠–٩)

```
❌ "السعر: ١٢٣٤"
✓ "السعر: 1234"
```

Always use Western numerals (0–9), even in Arabic UI.

## Recommended Libraries

### Web (Next.js or React)

- **`next-intl`** — Built for Next.js, excellent RTL support, type-safe message keys
  ```bash
  npm install next-intl
  ```
  Configuration in `next.config.js`, message files in `messages/` directory.

- **`react-i18next`** — Popular, flexible, works with any React setup
  ```bash
  npm install i18next react-i18next
  ```
  Share translation files with backend/mobile via `@sakani/shared`.

### Mobile (React Native/Expo)

- **`react-i18next`** — Same library as web, share translation files
- **`expo-localization`** — Get device locale
  ```bash
  npx expo install expo-localization
  ```

### Shared (Backend & Frontend)

- **`i18next`** — Core i18n engine, language-agnostic
- Message files in JSON or TypeScript in shared package (`@sakani/shared/i18n/`)
- Both frontend and backend import from shared package

### Date & Time

- **`date-fns`** — Lightweight, tree-shakeable, excellent locale support
  ```bash
  npm install date-fns
  ```
  Import locales: `import { ar } from 'date-fns/locale'`

- **Native `Intl` API** — Built-in, no dependencies, sufficient for most use cases
  ```typescript
  new Intl.DateTimeFormat('ar-JO', { ... }).format(date)
  ```

## Summary Checklist

- [ ] All UI strings use message keys (`key.domain.entity`)
- [ ] Backend returns message keys, never display text
- [ ] Frontend resolves keys via i18n library (next-intl, react-i18next, etc.)
- [ ] Web: `tailwindcss-rtl` installed, using logical properties (`ms-`, `ps-`, `text-start`)
- [ ] Web: Root `dir="rtl"` set when locale is Arabic
- [ ] Mobile: `I18nManager.forceRTL(isArabic)` on app init
- [ ] Icons tested and flipped for RTL (chevrons, arrows)
- [ ] Date formatting uses `Intl.DateTimeFormat` or `date-fns` with locale
- [ ] All numerals are Western (0–9), never Eastern (٠–٩)
- [ ] Mixed-direction content (Arabic + English) uses `<bdi>` or `dir="auto"`
- [ ] Phone numbers, emails, URLs wrapped in `dir="ltr"`
- [ ] Locale preference stored in user profile (synced) + device storage (offline)
- [ ] Locale switcher tested: changes are persisted and UI updates immediately
- [ ] RTL testing done with **actual Arabic text**, not placeholders
