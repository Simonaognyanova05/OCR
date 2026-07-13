# AGENTS.md

Instructions for AI agents working in this repository.

## First Rule

Before making code changes, read the relevant `.ai` context files. Do not guess the project architecture from file names alone.

Always read these three files first:

- `.ai/context/project-context.md`
- `.ai/context/architecture.md`
- `.ai/context/coding-standards.md`

Then read additional files based on the task type.

## Task Routing

### New Feature

Read:

- `.ai/context/features.md`
- `.ai/context/business-rules.md`
- `.ai/planning/analyze-feature.md`
- `.ai/planning/design-feature.md`
- `.ai/planning/implementation-plan.md`
- `.ai/checklists/feature-checklist.md`

Use when the user asks to add or expand functionality.

### Backend Work

Read:

- `.ai/implementation/backend.md`
- `.ai/implementation/api.md`
- `.ai/implementation/database.md` if models, queries, or persistence are affected
- `.ai/context/business-rules.md`

Use for Express routes, controllers, services, repositories, models, auth, uploads, OCR, exports, and dashboard logic.

### Frontend Work

Read:

- `.ai/implementation/frontend.md`
- `.ai/context/features.md`
- `.ai/context/business-rules.md`

Use for React pages, components, hooks, services, routing, state, styling, and UX changes.

### API Work

Read:

- `.ai/implementation/api.md`
- `.ai/audit/api-audit.md`
- `.ai/context/architecture.md`

Use for new endpoints, route changes, request/response changes, downloads, pagination, and API validation.

### Database Work

Read:

- `.ai/implementation/database.md`
- `.ai/context/business-rules.md`
- `.ai/context/architecture.md`

Use for Mongoose schemas, indexes, query changes, migrations, and persistence behavior.

### Tests

Read:

- `.ai/implementation/tests.md`
- `.ai/context/coding-standards.md`
- `.ai/context/business-rules.md`

Use when adding regression tests, verification scripts, or test infrastructure.

### Security Finding Or Remediation

Read:

- `.ai/security/verify-finding.md`
- `.ai/security/security-remediation.md`
- `.ai/security/re-audit.md`
- `.ai/audit/security-audit.md`
- `.ai/audit/reports/security-audit-report.md`

Use when verifying, fixing, or re-auditing a security issue.

### Audit

Read the matching audit file:

- Security: `.ai/audit/security-audit.md`
- Architecture: `.ai/audit/architecture-audit.md`
- Backend: `.ai/audit/backend-audit.md`
- API: `.ai/audit/api-audit.md`
- Performance: `.ai/audit/performance-audit.md`
- Release: `.ai/audit/release-audit.md`

For release readiness also read:

- `.ai/checklists/release-checklist.md`
- `.ai/checklists/production-checklist.md`

### Review

Read the matching review file:

- Code review: `.ai/review/code-review.md`
- Architecture review: `.ai/review/architecture-review.md`
- Performance review: `.ai/review/performance-review.md`
- Financial/accounting review: `.ai/review/financial-review.md`

When the user asks for a review, lead with findings ordered by severity.

### Debugging

Read:

- `.ai/debugging/root-cause.md`

If comparing payloads:

- `.ai/debugging/compare-json.md`

If fixing a regression:

- `.ai/debugging/fix-regression.md`

## Project-Specific Rules

### Architecture

- Backend uses CommonJS.
- Preserve the route-controller-service-repository layering.
- Keep controllers thin.
- Put business rules in services.
- Put persistence details and API mapping in repositories where that pattern exists.
- Frontend is a React SPA using Create React App conventions.

### Multi-Tenancy

- Company isolation is mandatory.
- Normal document queries and updates must be scoped by `companyId`.
- Do not trust company, membership, role, or user identifiers from request bodies.
- Use the authenticated context from `req.auth`.

### Security

- Protected resources require `requireAuth`.
- Role-sensitive operations require `requireRole`.
- System admin operations require `requireAdmin`.
- Uploaded source documents are sensitive and must not be public.
- Do not add or preserve public access to uploaded files.
- Never log secrets, bearer tokens, full OCR payloads, or sensitive document contents.

### OCR And Accounting

- Treat uploaded files, OCR output, and document text as untrusted.
- Sanitize extracted/reviewed document data before storage.
- Re-run review rules before approval.
- Do not invent missing accounting values.
- Dashboard and reports should use approved/exported documents.

### Encoding

- Many Bulgarian strings in existing files appear mojibake.
- Avoid broad copy rewrites unless the task is specifically to repair encoding.
- Keep new docs in readable UTF-8 or simple ASCII where practical.

## Verification

For backend changes, run or explain why you cannot run:

```bash
Get-ChildItem -Recurse -Filter *.js backend\src | ForEach-Object { node --check $_.FullName }
```

For frontend changes, run or explain why you cannot run:

```bash
npm run frontend:build
```

For security-sensitive changes, verify at least:

- anonymous access denied
- same-company access allowed
- cross-company access denied
- insufficient role denied

## Documentation Updates

Update `.ai/context/project-context.md` when commands, environment variables, deployment, or major repo structure change.

Update `.ai/context/architecture.md` when request flows, storage, boundaries, services, or route groups change.

Update `.ai/context/coding-standards.md` when coding patterns, testing expectations, or security conventions change.

Update `.ai/context/features.md` and `.ai/context/business-rules.md` when product behavior changes.

## Working Style

- Keep changes focused.
- Do not rewrite unrelated files.
- Do not revert user changes unless explicitly asked.
- Report what changed and how it was verified.
- If verification could not be run, say why.
