---
name: Generated UI scaffold audits
description: A durable approach for safely reducing generated component and dependency scaffolding.
---

Audit generated UI libraries by tracing imports from the application entry points before deleting components or their packages. Keep only components with a live consumer, then confirm the result with typecheck, a production build, and a rendered preview.

**Why:** Generated React templates often include dozens of valid but unused primitives. Deleting based only on filenames can remove transitive dependencies that are still live, while import reachability and bundle size provide evidence of what the product actually needs.

**How to apply:** Start with a repository-wide import search, distinguish direct consumers from dependencies of unused primitives, update the lockfile through the package manager, and verify both the runtime and production bundle after cleanup.