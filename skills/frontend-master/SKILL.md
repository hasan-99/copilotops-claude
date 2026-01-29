---
name: frontend-master
description: Complete frontend development - build components, design UIs, modernize interfaces. Use --build (default), --design for distinctive aesthetics, or --modernize for legacy UI transformation.
model: claude-opus-4-5-20251101
tags: [frontend, react, design, ui, animations, tailwind, 2025]
---

# Frontend Master

One skill for all frontend work. I detect your stack and apply the right patterns.

## Modes

Use flags to specify what you need:
- `--build` (default): Build components with animations
- `--design`: Create distinctive, anti-AI-slop interfaces
- `--modernize`: Transform legacy UIs with modern patterns

## What I Do

### --build Mode (Default)
1. **Detect your stack** - React? Vue? Plain HTML? I adapt
2. **Build the component** - Structure, styling, layout
3. **Add motion** - Entrance, hover, scroll effects
4. **Apply effects** - Gradients, glass, glow, shadows
5. **Make it responsive** - Works on all screens

### --design Mode
Create DISTINCTIVE interfaces that avoid generic AI aesthetics:
- Bold aesthetic directions (minimal, maximalist, retro-futuristic, luxury, playful, editorial, brutalist)
- Unique typography choices (not Inter/Roboto)
- Memorable color palettes
- Intentional motion and spatial composition

### --modernize Mode
Transform outdated UIs:
- Setup modern design system (Tailwind, shadcn/ui)
- Add dark mode support
- Implement accessibility
- Add micro-interactions
- Optimize performance

## My Process

### Step 1: Analyze Codebase
```
- Check package.json for framework (React, Vue, Svelte)
- Check for Tailwind, CSS modules, styled-components
- Check for animation libraries (framer-motion, gsap)
- Match existing code style
```

### Step 2: Build/Design
```
- Use existing UI library if present (shadcn, etc.)
- Match existing typography and colors
- Follow project conventions
- Write clean, readable code
```

### Step 3: Add Motion
```
React/Next.js → Motion (Framer Motion) or existing lib
Vue → vue-motion or CSS
Svelte → svelte/motion or CSS
Plain HTML → CSS animations + scroll-driven
```

### Step 4: Polish
```
- Hover states that feel good
- Focus states for accessibility
- Smooth transitions
- Loading states if needed
```

## Related Skills
- **responsive** - Deep responsive design analysis and fixes
- **frontend-debug** - Fix visual bugs, layout issues, CSS conflicts

## 2025 Frontend Stack

```
Framework:     React 19 / Next.js 15 / Astro 5
Styling:       Tailwind CSS v4
Components:    shadcn/ui + Magic UI / Aceternity UI
Animation:     Motion (Framer Motion) / GSAP
Icons:         Lucide React / Phosphor Icons
Forms:         React Hook Form + Zod (with React 19 Actions)
State:         React 19 built-ins / Zustand / TanStack Query
```

## Animation Patterns

### Entrance
- Fade up from below (default, subtle)
- Scale in (for modals, cards)
- Slide from side (for drawers, panels)
- Stagger children (for lists, grids)

### Hover
- Subtle lift with shadow
- Scale 1.02-1.05
- Color/background shift
- Border glow

### Scroll
- Reveal on enter viewport
- Parallax backgrounds
- Progress indicators
- Sticky transforms

## Effects I Know

- **Glass**: `backdrop-blur-xl bg-white/10 border-white/20`
- **Glow**: Pseudo-element blur behind
- **Gradient border**: Wrapper with gradient bg, inner with solid bg
- **Noise texture**: SVG filter or image overlay
- **Spotlight**: Radial gradient following cursor

## Quick Recipes

### Glass Card with Animated Border
```tsx
<motion.div
  className="relative p-[1px] rounded-2xl overflow-hidden"
  whileHover={{ scale: 1.02 }}
>
  <div className="absolute inset-0 bg-[conic-gradient(from_90deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6)] animate-spin-slow" />
  <div className="relative backdrop-blur-xl bg-black/80 rounded-2xl p-6">
    <h3 className="text-xl font-bold text-white">Content</h3>
  </div>
</motion.div>
```

### Scroll-Triggered Reveal
```tsx
function RevealSection({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}
```

### Staggered Page Load
```tsx
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
```

## Design Aesthetics (--design mode)

### Typography
- Display: Satoshi, General Sans, Clash Display, Cabinet Grotesk
- Body: Geist, Plus Jakarta Sans, Outfit, Sora
- Mono: Geist Mono, JetBrains Mono, Berkeley Mono

### Color (2025)
```css
:root {
  /* Use oklch for perceptually uniform colors */
  --primary: oklch(60% 0.15 250);
  --primary-light: oklch(from var(--primary) calc(l + 0.2) c h);
  --hover: color-mix(in oklch, var(--primary) 80%, white);
}
```

### Anti-Patterns to AVOID
- Overused fonts: Inter, Roboto, Arial
- Cliched: Purple-to-blue gradients on white
- Predictable layouts: Centered hero, three-column features
- Over-reliance on drop shadows
- Generic stock photography

## Modern UI Components

### FadeIn Animation
```tsx
export const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);
```

### HoverCard
```tsx
export const HoverCard = ({ children }) => (
  <motion.div
    whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  >
    {children}
  </motion.div>
);
```

### Skeleton Loader
```tsx
export const Skeleton = ({ className }) => (
  <div className={cn(
    'relative overflow-hidden rounded-lg bg-muted',
    'before:absolute before:inset-0 before:-translate-x-full',
    'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    'before:animate-shimmer',
    className
  )} />
);
```

## Performance Best Practices

1. **Use CSS transforms** for animations (GPU-accelerated)
2. **Lazy load** heavy components and images
3. **Prefer Server Components** for static content
4. **Use container queries** for responsive components
5. **Optimize fonts** with `display: swap` and subsetting
6. **Respect reduced motion** preferences

```tsx
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

## Trigger Phrases

- "build a component" → --build mode
- "design a page" → --design mode
- "modernize this UI" → --modernize mode
- "create distinctive interface" → --design mode
- "add animations" → --build mode

---

## Quick Reference: CSS 2025

### Native Nesting
```css
.card {
  padding: 1rem;
  & .title { font-weight: bold; }
  &:hover { background: var(--hover); }
  @media (width >= 768px) { padding: 2rem; }
}
```

### :has() Selector
```css
/* Parent has focused child */
.form-group:has(input:focus) { border-color: blue; }
/* Card with image */
.card:has(img) { padding: 0; }
/* Sibling state */
label:has(+ input:invalid) { color: red; }
```

### Container Queries
```css
.card-container { container-type: inline-size; }
@container (width >= 400px) {
  .card { flex-direction: row; }
}
```

### Scroll-Driven Animations (CSS-only)
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}
.reveal-on-scroll {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
/* Scroll progress bar */
.progress {
  animation: grow-width linear;
  animation-timeline: scroll();
}
```

### Anchor Positioning
```css
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
  position-try-fallbacks: flip-block, flip-inline;
}
```

### View Transitions API
```tsx
// React pattern
function navigate(url: string) {
  if (!document.startViewTransition) {
    router.push(url); return;
  }
  document.startViewTransition(() => router.push(url));
}
```

### Color Functions
```css
:root {
  --primary: oklch(60% 0.15 250);
  --hover: color-mix(in oklch, var(--primary) 80%, white);
  --light: oklch(from var(--primary) calc(l + 0.2) c h);
}
```

---

## Quick Reference: React 19

### Actions & Form Handling
```tsx
// Server Action
async function submitForm(formData: FormData) {
  'use server';
  const name = formData.get('name');
  await db.users.create({ name });
  revalidatePath('/users');
}

// useActionState (replaces useFormState)
function Form() {
  const [state, formAction, isPending] = useActionState(submitForm, null);
  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

### useOptimistic
```tsx
function TodoList({ todos }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function addTodo(formData) {
    const todo = { id: Date.now(), text: formData.get('text') };
    addOptimistic(todo);
    await createTodo(todo);
  }

  return optimisticTodos.map(todo => (
    <div style={{ opacity: todo.pending ? 0.5 : 1 }}>{todo.text}</div>
  ));
}
```

### use() Hook
```tsx
// Unwrap promises in render
function UserProfile({ userPromise }) {
  const user = use(userPromise); // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// Conditional context
function Theme({ showTheme }) {
  if (showTheme) {
    const theme = use(ThemeContext);
    return <div style={{ color: theme.color }} />;
  }
}
```

### useFormStatus
```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>;
}
```

### Server Components Pattern
```tsx
// Server Component (default) - runs on server, no client JS
async function ProductList() {
  const products = await db.products.findMany();
  return products.map(p => <ProductCard key={p.id} product={p} />);
}

// Client Component - add 'use client' for interactivity
'use client';
function AddToCart({ productId }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>{added ? '✓' : 'Add'}</button>;
}
```

---

## Quick Reference: Animation Libraries

### Motion (Framer Motion)
```tsx
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';

// Layout animations
<motion.div layout layoutId="shared-element" />

// Scroll-linked
const { scrollYProgress } = useScroll();
const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

// Gestures
<motion.div drag dragConstraints={{ left: 0, right: 100 }} whileDrag={{ scale: 1.1 }} />

// Exit animations
<AnimatePresence mode="wait">
  {show && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### GSAP
```tsx
import gsap from 'gsap';
import { ScrollTrigger, SplitText } from 'gsap/all';
gsap.registerPlugin(ScrollTrigger, SplitText);

// Timeline
const tl = gsap.timeline();
tl.to('.box', { x: 100, duration: 1 })
  .to('.box', { rotation: 360 }, '-=0.5');

// ScrollTrigger
gsap.to('.parallax', {
  y: -200,
  scrollTrigger: { trigger: '.section', scrub: true, start: 'top bottom', end: 'bottom top' }
});

// Text animation
const split = new SplitText('.headline', { type: 'chars' });
gsap.from(split.chars, { opacity: 0, y: 50, stagger: 0.02 });
```

### Rive (Interactive)
```tsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

function RiveButton() {
  const { rive, RiveComponent } = useRive({
    src: '/button.riv',
    stateMachines: 'State Machine 1',
    autoplay: true
  });
  const hoverInput = useStateMachineInput(rive, 'State Machine 1', 'isHovered');

  return (
    <RiveComponent
      onMouseEnter={() => hoverInput && (hoverInput.value = true)}
      onMouseLeave={() => hoverInput && (hoverInput.value = false)}
    />
  );
}
```

---

## Quick Reference: UI Component Libraries

### shadcn/ui Setup
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog
```

```tsx
// Usage - components are in your codebase, fully customizable
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent><Button variant="outline">Click</Button></CardContent>
</Card>
```

### Dark Mode
```tsx
// next-themes setup
import { ThemeProvider } from 'next-themes';
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>

// Toggle
import { useTheme } from 'next-themes';
const { theme, setTheme } = useTheme();
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle</Button>
```

### Magic UI / Aceternity Components
```tsx
// Animated gradient background
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-3xl opacity-20 animate-pulse" />
  <div className="relative">{content}</div>
</div>

// Spotlight effect
<div className="group relative overflow-hidden">
  <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity group-hover:opacity-100"
       style={{ background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.1), transparent 80%)` }} />
</div>

// Animated border
<div className="relative p-[1px] rounded-xl overflow-hidden">
  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6)] animate-[spin_3s_linear_infinite]" />
  <div className="relative bg-background rounded-xl p-4">{content}</div>
</div>

// Text gradient
<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
  Gradient Text
</span>

// Blur fade text
<motion.p initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0)' }}>
  Blur Fade In
</motion.p>
```

### Motion Primitives
```tsx
// Magnetic button
function MagneticButton({ children }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    setPosition({ x: (e.clientX - left - width/2) * 0.3, y: (e.clientY - top - height/2) * 0.3 });
  };

  return (
    <motion.button ref={ref} onMouseMove={handleMouse} onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      animate={position} transition={{ type: 'spring', stiffness: 150 }}>
      {children}
    </motion.button>
  );
}

// Number ticker
<motion.span key={value}>{value.toLocaleString()}</motion.span>
```

---

## Responsive Breakpoints

```css
/* Mobile-first */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

```tsx
// Tailwind responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// Container queries (component-responsive)
<div className="@container">
  <div className="@md:flex-row flex-col">
```
