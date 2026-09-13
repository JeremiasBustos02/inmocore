\# InmoCore



InmoCore is a multi-tenant real-estate platform with a public property website and an internal management dashboard.



\## Stack



\* Next.js App Router

\* React

\* TypeScript strict

\* Tailwind CSS

\* shadcn/ui

\* PostgreSQL / Supabase

\* Drizzle ORM

\* Supabase Auth

\* Supabase Storage

\* Zod

\* pnpm



\## Engineering principles



Prefer the simplest correct implementation.



Follow KISS and YAGNI.



Avoid overengineering, speculative abstractions, unnecessary layers, premature optimization, and dependencies without a concrete need.



Do not introduce patterns only because they are considered best practices.



Use the `inmocore-engineering` skill for implementation, architecture, debugging, reviews, UX/UI, database, security, or refactoring decisions.



Use other installed skills only when relevant to the current task.



\## Next.js



Prefer Server Components.



Use Client Components only when browser APIs, hooks, client state, or interactivity require them.



Keep business logic outside presentational React components.



Prefer server-side data access.



\## Multi-tenancy



Every private resource must belong to an authorized organization.



Never trust `organizationId` received from the browser for authorization.



Tenant authorization must be validated server-side.



\## Scope



Modify only what the current task requires.



Do not perform unrelated refactors, renames, dependency upgrades, or directory reorganizations.



Do not implement future milestone functionality unless explicitly requested.



\## Context efficiency



Read only files relevant to the current task.



Search for files and symbols before opening large portions of the repository.



Do not scan the whole repository by default.



Read `/docs` files only when relevant.



Avoid rereading unchanged files.



\## Verification



Run the smallest relevant verification after changes.



Usually:



\* focused tests when applicable;

\* typecheck;

\* lint.



Never claim a check passed unless it was actually executed.



\## Git



Do not commit.



Do not push.



Do not rewrite Git history.



Never commit secrets or environment credentials.



\## Communication



Keep final reports concise.



Include only:



1\. files changed;

2\. important decisions;

3\. verification results;

4\. real remaining issues.



Do not paste full files or repeat the task description.



