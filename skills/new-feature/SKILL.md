---
name: new-feature
description: Complete feature development pipeline - plan, implement with TDD, review, commit. Full workflow from idea to merged code.
model: claude-opus-4-5-20251101
tags: [feature, development, tdd, workflow, planning]
---

# New Feature

Complete feature development from planning to commit.

## Pipeline

```
1. Plan & Design
       ↓
2. Create Tests (TDD)
       ↓
3. Implement Feature
       ↓
4. Code Review
       ↓
5. Git Commit
```

## Quick Start

Say: "new feature: [description]"

Example: "new feature: add user profile page with avatar upload"

I will:
1. Break down the feature into tasks
2. Write tests first (TDD)
3. Implement the feature
4. Review the code
5. Create a clean commit

## Stage 1: Plan & Design

### Feature Breakdown
```markdown
## Feature: User Profile Page

### Tasks:
1. [ ] Create ProfilePage component
2. [ ] Add avatar upload functionality
3. [ ] Implement profile form
4. [ ] Connect to Supabase storage
5. [ ] Add loading/error states
6. [ ] Write tests
```

### Architecture Decision
```markdown
## Technical Approach

**Components:**
- ProfilePage (container)
- AvatarUploader (upload widget)
- ProfileForm (form fields)

**State:**
- Use React Query for data fetching
- Local state for form

**API:**
- GET /api/profile
- PUT /api/profile
- POST /api/upload-avatar
```

## Stage 2: Create Tests (TDD)

Write tests BEFORE implementation:

```typescript
// __tests__/ProfilePage.test.tsx
describe('ProfilePage', () => {
  it('renders user profile', async () => {
    render(<ProfilePage userId="123" />);
    expect(await screen.findByText('Profile')).toBeInTheDocument();
  });

  it('allows avatar upload', async () => {
    render(<ProfilePage userId="123" />);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload avatar');
    await userEvent.upload(input, file);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('saves profile changes', async () => {
    render(<ProfilePage userId="123" />);
    await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
    await userEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
  });

  it('shows error on save failure', async () => {
    server.use(/* mock failure */);
    render(<ProfilePage userId="123" />);
    await userEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Failed to save')).toBeInTheDocument();
  });
});
```

Run tests (should fail initially):
```bash
npm test ProfilePage
```

## Stage 3: Implement Feature

Implement until tests pass:

```typescript
// components/ProfilePage.tsx
export function ProfilePage({ userId }: Props) {
  const { data: profile, isLoading } = useProfile(userId);
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: uploadAvatar } = useUploadAvatar();

  if (isLoading) return <Skeleton />;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <AvatarUploader
        currentUrl={profile.avatarUrl}
        onUpload={(file) => uploadAvatar({ userId, file })}
      />

      <ProfileForm
        profile={profile}
        onSubmit={(data) => updateProfile({ userId, ...data })}
      />
    </div>
  );
}
```

Run tests (should pass):
```bash
npm test ProfilePage
# All tests passing ✓
```

## Stage 4: Code Review

Self-review checklist:

```markdown
## Code Review Checklist

### Functionality
- [ ] Feature works as specified
- [ ] Edge cases handled
- [ ] Error states covered

### Code Quality
- [ ] TypeScript types complete
- [ ] No console.log/debugger
- [ ] DRY - no duplication
- [ ] Clear naming

### Performance
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Lazy loading where appropriate

### Accessibility
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Color contrast sufficient

### Security
- [ ] Input validated
- [ ] No XSS vulnerabilities
- [ ] Auth checks in place
```

Using code-review agent:
```
Review: new ProfilePage implementation
Check: Type safety, performance, accessibility
```

## Stage 5: Git Commit

Create clean commit with conventional message:

```bash
# Stage changes
git add src/components/ProfilePage.tsx
git add src/components/AvatarUploader.tsx
git add __tests__/ProfilePage.test.tsx

# Commit with conventional message
git commit -m "$(cat <<'EOF'
feat(profile): add user profile page with avatar upload

- Add ProfilePage component with form and avatar
- Implement avatar upload to Supabase storage
- Add comprehensive test coverage
- Handle loading and error states

🤖 Generated with Claude Code
EOF
)"
```

## TodoWrite Integration

Automatic task tracking:

```typescript
TodoWrite([
  { content: "Plan feature architecture", status: "completed" },
  { content: "Write tests (TDD)", status: "completed" },
  { content: "Implement ProfilePage", status: "completed" },
  { content: "Implement AvatarUploader", status: "completed" },
  { content: "Code review", status: "completed" },
  { content: "Commit changes", status: "in_progress" }
]);
```

## Flags

- `--skip-tests` - Skip TDD (not recommended)
- `--no-review` - Skip code review stage
- `--draft` - Don't commit, leave as draft
- `--branch [name]` - Create feature branch

## Best Practices

1. **Test first** - Write failing tests before code
2. **Small commits** - One logical change per commit
3. **Clear naming** - Self-documenting code
4. **Handle errors** - Always show user feedback
5. **Document decisions** - Leave comments for non-obvious choices

## Integration with Other Skills

- **tdd-workflow** - For test-first development
- **frontend-master** - For UI component implementation
- **supabase** - For backend integration
- **git-flow** - For commit conventions

## My Process

1. **Understand requirements** - What exactly is needed?
2. **Plan architecture** - Components, state, API
3. **Write tests** - Define expected behavior
4. **Implement** - Code until tests pass
5. **Review** - Self-check quality
6. **Commit** - Clean, conventional message

## Trigger Phrases

- "new feature:"
- "implement feature"
- "add feature"
- "build feature"
