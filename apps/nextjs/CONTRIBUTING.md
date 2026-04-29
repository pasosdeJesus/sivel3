# Contributing to SIVeL 3 — Next.js

> *"Whatever you do, do everything for the glory of God"* (1 Corinthians 10:31, CSB)

This document defines the documentation and testing policies for the Next.js application. For project-wide conventions (structure, languages, code style), see the root [CONTRIBUTING.md](../../CONTRIBUTING.md). For available commands (`make test`, `make type`), see [README.md](../README.md).

---

## Documentation Policy

### Principles

1. **Good names > Comments.** Self-documenting code with descriptive names is the best documentation.
2. **Tests > JSDoc.** A well-written test documents expected behavior and verifies itself. JSDoc ages poorly and we don't use it.
3. **Document the "why", not the "what".** The "what" is in the code. The "why" (design decisions, platform constraints, protocols) is what deserves explanation.
4. **Architecture and tool documentation.** What actually adds value: flow diagrams, cross-system protocols, API guides, custom tool manuals.

### What We Document

| Type | Location | Purpose | Example |
|------|----------|---------|---------|
| Directory index | `lib/README.md`, `db/README.md`, `app/api/README.md` | Brief map of what's in the directory, references to `doc/` for complex topics | |
| Feature/protocol | `doc/<feature>.md` | Self-contained document that can be understood without reading the codebase. Potentially reusable in other projects. | `doc/donation-flow.md` |
| Module comments | Top of `.ts` files with complex logic | Protocol details, design rationale, external references. | `lib/learningPoints.ts` |

### Decision Criterion: `doc/` vs. Inline Comment

| Criterion | Where | Example |
|-----------|-------|---------|
| Cross-system protocol or cross-project reusable design | `doc/<feature>.md` | Donation flow (sivel.xyz ↔ Celo ↔ learn.tg), i18n strategy |
| Internal module decision — *why* this implementation, not another | Comment at top of `.ts` file | Nonce sync protocol in `learningPoints.ts`, MiniPay `ethereum.send` rationale in `donate.ts` |
| What the code does, how it behaves | **Test** | `useTranslation.test.ts` documents every fallback rule |

### What We Don't Document

- **JSDoc on functions** — tests and descriptive names are sufficient.
- **Obvious line comments** — `// increment counter` next to `counter++` adds nothing.
- **Documentation that duplicates tests** — if a test covers a case, no need to explain it in prose.

### Format

- All code (variable names, comments, commit messages) and documentation in English. Spanish is only acceptable for domain-specific content (e.g., legal terms from Colombian law).
- `doc/` documents are feature-specific, self-contained, and potentially migrable to `@pasosdejesus/m`.

---

## Refactoring Policy

> *"By wisdom a house is built, and by understanding it is established"* (Proverbs 24:3, CSB)

### Principles

1. **DRY.** Duplicated code is technical debt. When you see the same pattern in three places, extract it.
2. **Extract to `@pasosdejesus/m` first.** Code that is useful across projects (test utilities, CLI commands, protocols, component patterns) belongs in the shared `m` package, not copied into each project.
3. **Design for the ecosystem.** Tools we build for ourselves may serve the broader dpJ ecosystem and eventually the open source community. Prefer generic, well-tested abstractions over project-specific hacks.
4. **Baby steps.** Refactor in small, focused commits. Don't mix refactoring with feature work.

---

## Testing Policy

### Principles

1. **Tests > JSDoc.** A test is living documentation that never goes out of date.
2. **Coverage focused by layer.** Not everything deserves the same effort.

### Coverage Targets

| Layer | Target | Priority |
|-------|--------|----------|
| Critical logic (`lib/`, `api/`) | 80-90% | High |
| Contexts and hooks (`contexts/`, `hooks/`) | 60-70% | Medium |
| UI components (`components/`) | 30-50% | Low |

### What to Test First

1. **Money-touching code** — donation flow, Learning Points, balance, signatures.
2. **Integration flows** — full donation (on-chain → backend → LP).
3. **Edge cases** — nonce out of order, retries, insufficient balance, invalid signatures, network timeouts.
4. **Error handling** — wallet errors, backend errors, user-friendly messages.

### Tools

- **Vitest** with `--coverage` (v8 provider).
- **`@pasosdejesus/m`** test utils for database, viem, and wallet mocks. See [test-utils documentation](https://gitlab.com/pasosdeJesus/m/-/blob/main/src/test-utils/README.md).
- **`vi.mock`** for module mocking.
- **`// @vitest-environment jsdom`** pragma for React hook tests.

