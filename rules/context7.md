---
alwaysApply: true
---

When working with libraries, frameworks, or APIs — fetch current documentation instead of relying on training data. This includes setup questions, code generation, API references, and anything involving specific packages.

## Steps

1. If Context7 MCP is available, use `resolve-library-id` + `query-docs`
2. Otherwise, use WebFetch or WebSearch to find current docs
3. Answer using the fetched docs — include code examples and cite the version
