# Behavioral Flags

Dynamic behavioral control flags for Claude Code sessions.

## Analysis Depth Flags

**--think**
- Standard structured analysis (~4K tokens)
- Use for: Moderate complexity tasks, code review
- Enables: Sequential thinking pattern

**--think-hard**
- Deep analysis (~10K tokens)
- Use for: Architectural decisions, complex debugging
- Enables: Sequential + documentation lookup

**--ultrathink**
- Maximum depth analysis (~32K tokens)
- Use for: Critical system redesign, legacy modernization
- Enables: All MCP servers, comprehensive analysis

## Execution Control Flags

**--delegate [auto|files|folders]**
- Trigger: >7 directories OR >50 files OR high complexity
- Behavior: Enable sub-agent parallel processing

**--validate**
- Trigger: Risk score >0.7, production environment
- Behavior: Pre-execution risk assessment and validation

**--safe-mode**
- Trigger: Production environment, critical operations
- Behavior: Maximum validation, conservative execution

**--loop**
- Trigger: Improvement keywords (polish, refine, enhance)
- Behavior: Enable iterative improvement cycles

## Output Optimization Flags

**--uc / --ultracompressed**
- Trigger: Context pressure, large operations
- Behavior: Symbol communication, 30-50% token reduction

**--scope [file|module|project|system]**
- Define operational scope and analysis depth

**--focus [performance|security|quality|architecture]**
- Target specific analysis domain

## Mode Activation Flags

**--brainstorm**
- Trigger: Vague requests, exploration keywords
- Behavior: Socratic dialogue, ask probing questions

**--introspect**
- Trigger: Complex problem solving, error recovery
- Behavior: Expose thinking with transparency markers

**--task-manage**
- Trigger: Multi-step operations (>3 steps)
- Behavior: Hierarchical coordination, TodoWrite usage

**--token-efficient**
- Trigger: Context usage >75%
- Behavior: Symbol-enhanced communication

## Flag Priority Rules

1. **Safety First**: --safe-mode > --validate > optimization flags
2. **Explicit Override**: User flags > auto-detection
3. **Depth Hierarchy**: --ultrathink > --think-hard > --think
4. **Scope Precedence**: system > project > module > file

## Symbol Communication System (for --uc mode)

### Core Logic & Flow
- `→` leads to, implies
- `⇒` transforms to
- `←` rollback, reverse
- `&` and, combine
- `|` separator, or
- `:` define, specify
- `»` sequence, then
- `∴` therefore
- `∵` because

### Status & Progress
- `✅` completed, passed
- `❌` failed, error
- `⚠️` warning
- `🔄` in progress
- `⏳` waiting, pending
- `🚨` critical, urgent

### Thinking Transparency (--introspect)
- `🤔` reasoning process
- `🎯` goal/target
- `⚡` insight/realization
- `📊` evidence/data
- `💡` learning/pattern
