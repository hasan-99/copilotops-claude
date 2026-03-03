# TypeScript Strictness Audit Checklist

IMPORTANT: Search the project's actual source directories (detected in Phase 0), NOT hardcoded src/.

## Type Safety
- [ ] strict: true in tsconfig.json
- [ ] noUncheckedIndexedAccess: true enabled (catches array/object index bugs)
- [ ] No "any" types — replace with specific types or "unknown"
- [ ] No ts-ignore — use ts-expect-error with explanation if absolutely needed
- [ ] No "as Type" assertions that could be replaced with type guards
- [ ] No non-null assertions (!) hiding potential null bugs
- [ ] No Object, Function, or {} as types

## Patterns to Search For

Search in the project's actual source directories:

- Find all "any" types: search for ": any", "<any>", " as any", "any[]" in .ts and .tsx files
- Find ts-ignore: search for @ts-ignore and @ts-expect-error in .ts and .tsx files
- Find type assertions: search for " as " followed by uppercase letter in .ts and .tsx files
- Find non-null assertions: search for !. pattern (letter/paren/bracket followed by !.) in .ts and .tsx files
- Find loose types: search for ": Object", ": Function", ": {}" in .ts and .tsx files
- Find Promise of any: search for "Promise<any>" in .ts and .tsx files

## Function Signatures
- [ ] Exported functions have explicit return types
- [ ] Async functions return Promise of SpecificType, not Promise of any
- [ ] Event handlers properly typed (React.ChangeEvent of HTMLInputElement, React.FormEvent of HTMLFormElement)
- [ ] Callback props properly typed (not Function or (...args: any[]) => any)
- [ ] No overuse of generics — keep types concrete when possible
- [ ] Server actions return typed results (not any or unknown)

## Data Types
- [ ] API responses have proper type definitions
- [ ] Supabase types generated and used (Database['public']['Tables'])
- [ ] Form data validated with Zod and inferred types (z.infer of typeof schema)
- [ ] Union types narrowed properly (discriminated unions, type guards, exhaustive checks)
- [ ] Const objects or union types used instead of enums (enums have runtime overhead)
- [ ] No "string" where a string literal union would be safer ('pending' | 'active' | 'done')

## Component Props
- [ ] Props interface/type defined for every component (not inline in function signature)
- [ ] Optional props have sensible defaults (destructuring defaults)
- [ ] Children prop typed correctly (React.ReactNode)
- [ ] Event handler props follow React conventions (onX naming)
- [ ] No unused props in interface
- [ ] React 19: ref is a regular prop (no need for forwardRef)

## Common Fixes
- data: any -> data: UserResponse
- (e: any) => ... -> (e: React.ChangeEvent of HTMLInputElement) => ...
- result as User -> Type guard or proper generic
- obj!.property -> if (obj) then obj.property, or optional chaining obj?.property
- ts-ignore -> Fix the actual type error
- Function -> () => void or specific signature
- Object -> Record<string, unknown> or specific interface
- {} -> Record<string, never> or specific interface
- enum Status -> const STATUS = { ... } as const + type Status = typeof STATUS[keyof typeof STATUS]
- string for fixed values -> 'pending' | 'active' | 'done'
