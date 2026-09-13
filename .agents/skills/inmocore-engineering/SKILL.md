---

name: inmocore-engineering
description: Engineering rules for planning, implementing, reviewing, debugging, or refactoring InmoCore. Prioritize simple code, minimal architecture, low technical debt, good UX, maintainability, security, and token-efficient repository exploration.
compatibility: opencode
metadata:
project: inmocore
priority: simplicity
--------------------

# InmoCore Engineering

Use this skill when planning, implementing, modifying, reviewing, debugging, or refactoring InmoCore.

## Core principle

Prefer the simplest correct solution.

Code should be:

* easy to understand;
* easy to change;
* easy to delete;
* explicit rather than clever;
* appropriately typed;
* secure;
* maintainable without unnecessary architecture.

Do not optimize for theoretical future requirements.

Follow:

* KISS;
* YAGNI;
* avoid premature abstraction;
* avoid premature optimization.

A solution with fewer moving parts is preferred when both alternatives correctly satisfy the requirement.

## Avoid overengineering

Do not introduce architectural patterns only because they are considered "best practice".

Avoid unless there is a concrete current requirement:

* repository pattern;
* generic repositories;
* service layers containing no real domain logic;
* factories;
* adapters;
* ports;
* CQRS;
* event buses;
* domain events;
* dependency injection frameworks;
* unnecessary interfaces;
* interfaces with only one implementation;
* excessive wrapper functions;
* unnecessary helper files;
* excessive component splitting;
* complex generic TypeScript types;
* speculative caching;
* speculative performance optimizations.

Do not create abstractions for code that exists only once.

Duplication of a few simple lines is sometimes preferable to a premature abstraction.

Extract shared code when duplication becomes meaningful or when there is a clear domain concept.

## Complexity rule

Before implementing a solution, ask internally:

1. Can this be done correctly with fewer files?
2. Can this be done with fewer abstractions?
3. Can existing platform/framework functionality solve it?
4. Is every new dependency necessary?
5. Would a junior developer understand this code quickly?

If a simpler solution provides the same correctness and maintainability, use the simpler solution.

Do not explain this internal evaluation unless it materially affects the result.

## Project architecture

InmoCore is a multi-tenant real-estate platform.

Main areas are:

* public real-estate website;
* administrative dashboard;
* organizations;
* users and memberships;
* properties;
* contacts;
* inquiries;
* operations;
* imports;
* metrics;
* site configuration.

Keep boundaries understandable without forcing every feature into multiple architectural layers.

Prefer feature-oriented organization where useful.

Do not create empty directories or placeholder modules for future milestones.

## Next.js / React

Prefer Server Components.

Use Client Components only when interactivity, browser APIs, hooks, or client state actually require them.

Keep `"use client"` boundaries as small as practical.

Prefer server-side data access.

Avoid client-side fetching when the same result can be obtained directly on the server.

Do not create an API endpoint when a Server Action or server-side function is clearly simpler and appropriate.

Do not create a Server Action when a plain server function is sufficient.

React components should primarily manage presentation and interaction.

Business rules should not be buried inside JSX.

Do not split tiny components merely to reduce line count.

Create a component when it:

* has a clear responsibility;
* is reused;
* improves readability;
* contains meaningful interaction or presentation logic.

## shadcn/ui

Prefer existing shadcn/ui primitives before creating custom versions of:

* dialogs;
* dropdowns;
* sheets;
* popovers;
* selects;
* tabs;
* tables;
* tooltips;
* commands;
* forms;
* alerts.

Customize visual appearance through composition and styling rather than rewriting primitives unnecessarily.

Do not force shadcn components where plain semantic HTML is simpler.

## TypeScript

Use strict TypeScript.

Do not use `any` unless technically unavoidable.

Do not hide errors with:

* `@ts-ignore`;
* unsafe type assertions;
* unnecessary casts.

Prefer inferred types when obvious.

Do not explicitly type everything.

Avoid complex generic types unless they solve a real problem.

Do not duplicate types that can safely be inferred from:

* Zod;
* Drizzle;
* framework APIs.

Use domain-specific types when they improve correctness or readability.

## Validation

Validate data at trust boundaries.

Examples:

* forms;
* imports;
* URL parameters;
* server actions;
* external requests.

Do not repeatedly validate the same trusted value deep inside internal functions.

Use Zod where runtime validation provides real value.

Do not create enormous schemas when smaller feature-local schemas are clearer.

## Database

Use PostgreSQL through Drizzle.

Prefer database constraints for rules the database can reliably guarantee.

Examples:

* NOT NULL;
* UNIQUE;
* foreign keys;
* CHECK constraints.

Do not duplicate database guarantees with complicated application logic unless better error handling requires it.

Schema changes must use migrations.

Do not manually mutate production schema.

## Multi-tenancy

Every private resource must belong to an organization directly or through an unambiguous relationship.

Never trust an `organizationId` received from the browser as authorization.

Resolve authorized organization context on the server.

Never query private tenant data without validated organization context.

Prefer simple explicit tenant filters.

Use PostgreSQL RLS where appropriate as defense in depth.

Do not build complicated tenant infrastructure before it is required.

## Security

Never expose:

* service role keys;
* database credentials;
* secrets;
* private environment values.

Validate authorization server-side.

Authentication is not authorization.

Never rely solely on hidden UI elements to protect operations.

Do not weaken security to simplify implementation.

## Files and organization

Prefer fewer meaningful files over many tiny files.

Do not create:

* `utils.ts` dumping grounds;
* unnecessary barrel exports;
* index files solely for re-exporting;
* folders containing one trivial file without organizational value.

Use descriptive filenames.

Keep code close to the feature that owns it.

Move code to shared modules only when it is truly shared.

## Dependencies

Before installing a package, check whether:

1. the platform already provides the functionality;
2. an existing dependency already provides it;
3. the implementation would otherwise be substantial or error-prone.

Do not add dependencies for trivial functionality.

Do not replace stable project dependencies without a concrete reason.

## UX/UI

The public website should feel:

* clean;
* premium;
* contemporary;
* highly readable;
* trustworthy.

Avoid generic AI-generated aesthetics.

Prefer:

* strong typography;
* clear hierarchy;
* generous but controlled spacing;
* subtle interaction;
* meaningful hover states;
* responsive layouts;
* accessible controls.

Animations should communicate state or improve perceived polish.

Avoid animation for animation's sake.

Prefer subtle transitions around 150–300 ms.

Administrative UI prioritizes:

* clarity;
* speed;
* scanability;
* information hierarchy;
* predictable interaction.

Do not sacrifice usability for visual novelty.

## Accessibility

Use semantic HTML.

Interactive elements must be keyboard accessible.

Use actual buttons and links instead of clickable divs.

Inputs require meaningful labels.

Images require appropriate alt text.

Do not rely exclusively on color to communicate state.

Maintain usable focus states.

## SEO

Public property pages must be designed for indexing.

When relevant use:

* meaningful URLs;
* metadata;
* canonical URLs;
* structured data;
* sitemap integration;
* semantic headings;
* internal links.

Do not add SEO complexity to private dashboard pages.

## Performance

Do not prematurely optimize.

First avoid obvious problems:

* unnecessary client components;
* unnecessary network requests;
* N+1 queries;
* oversized images;
* loading large datasets unnecessarily;
* avoidable React rerenders.

Only introduce caching or complex optimization when there is evidence or a clear requirement.

## Repository exploration

Be token-efficient.

Before reading files:

1. identify the feature involved;
2. search for relevant filenames or symbols;
3. inspect the smallest useful set of files;
4. expand only if required.

Do not scan the entire repository by default.

Do not recursively inspect generated directories.

Avoid reading:

* `node_modules`;
* `.next`;
* build output;
* lockfiles unless dependency resolution matters;
* unrelated migrations;
* unrelated documentation.

Use search before opening large files when looking for a specific symbol.

Do not reread unchanged files unnecessarily.

Do not read every related file "just in case".

## Documentation

Read documentation on demand.

Do not load all `/docs` files at the start of every task.

Read only documentation relevant to the current feature or architectural decision.

Keep new documentation concise.

Code should remain the primary source for implementation details.

## Change scope

Make the smallest coherent change that satisfies the requirement.

Do not:

* refactor unrelated code;
* rename unrelated files;
* reorganize directories opportunistically;
* apply formatting changes across unrelated files;
* change working behavior without a requirement.

If unrelated technical debt is discovered, mention it briefly instead of fixing it automatically.

## Debugging

Find the root cause before modifying code.

Prefer fixing the cause rather than adding defensive workarounds.

Do not stack patches around a broken assumption.

Use logs temporarily when useful, then remove noisy debugging output.

## Tests

Test behavior that matters.

Prioritize:

* business rules;
* permissions;
* tenant isolation;
* transformations;
* imports;
* important edge cases.

Do not test framework internals.

Do not create meaningless tests solely to increase coverage.

Avoid excessive mocking.

Prefer focused tests over large test suites for small changes.

## Verification

After modifying code, run the smallest relevant verification set.

Typically:

1. focused tests if applicable;
2. typecheck;
3. lint relevant to the project.

Do not run expensive full suites when a focused verification is enough.

Escalate verification when touching shared infrastructure, authentication, tenant isolation, or critical business rules.

Never claim a verification passed if it was not executed.

## Agent output

Keep final responses short.

Do not paste complete modified files.

Do not provide tutorials unless requested.

Report only:

* what changed;
* important decisions;
* verification performed;
* real remaining issues.

Avoid repeating information already present in the prompt.

Stop once the requested task and its verification are complete.

## Decision hierarchy

When choosing between implementations, prioritize in this order:

1. correctness;
2. security;
3. simplicity;
4. maintainability;
5. user experience;
6. performance;
7. abstraction elegance.

Elegant architecture is not a goal by itself.
