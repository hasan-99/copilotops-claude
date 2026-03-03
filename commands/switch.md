# /switch — Switch to a different project

Switch context to another Qualia project. Cleans current context and loads new project.

## Usage
`/switch <project-name>` or `/switch` (interactive — list all projects)

## Steps

1. **Save current state** — If there's work in progress:
   - Note current branch and uncommitted files
   - Warn if there are unstaged changes

2. **Find project** — Match argument against known projects:
   - Check `~/Desktop/Projects/Live-Projects/<name>`
   - Check `~/Desktop/Projects/aiagents/<name>`
   - Check `~/Desktop/Projects/voice/<name>`
   - Check `~/Desktop/Projects/websites/<name>`
   - Check `~/Desktop/Projects/Demos/<name>`
   - If no match, fuzzy-search and suggest closest

3. **Load new context** — `cd` to project, then:
   - Read its CLAUDE.md
   - Check git branch
   - Look up Supabase ref from deployment-map.md
   - Show quick status (like /status but abbreviated)

4. **Suggest /clear** if the previous project was unrelated (different type or domain)
