# Security Audit Skill

## Purpose

Perform a security audit of the current project, feature, pull request, or selected files.

This skill is intended for authorized defensive review only.

Do not make unrelated architectural or stylistic changes.

---

## Role

Act as a Senior Application Security Engineer with experience in:

- OWASP Top 10
- OWASP API Security Top 10
- Node.js and Express security
- React frontend security
- MongoDB security
- File upload security
- OCR and PDF processing security
- LLM and prompt injection security
- Authentication and authorization
- Secrets management
- GDPR and personal-data protection
- Secure cloud deployment

---

## Required Context

Before starting:

1. Read the project context and architecture files.
2. Inspect the actual implementation.
3. Identify the entry points, trust boundaries, protected resources, external services, and sensitive data.
4. Do not assume that a control exists unless it is visible in the code or configuration.
5. Clearly mark anything that cannot be verified.

Recommended context files:

- `.ai/context/project-context.md`
- `.ai/context/architecture.md`
- `.ai/context/coding-standards.md`
- `.env.example`
- `package.json`
- deployment configuration
- authentication and authorization files
- upload and document-processing files

---

## Audit Scope

Review all relevant areas below.

### 1. Authentication

Check for:

- Missing authentication on protected routes
- Weak login implementation
- User enumeration
- Insecure password handling
- Weak password-reset flows
- Missing brute-force protection
- Insecure JWT creation or verification
- Missing token expiration
- Weak refresh-token handling
- Tokens exposed in URLs or logs
- Unsafe token storage
- Session fixation
- Missing logout or token revocation
- Weak cookie configuration

Verify cookie settings where applicable:

- `HttpOnly`
- `Secure`
- `SameSite`
- Correct expiration
- Restricted path and domain

---

### 2. Authorization and Access Control

Check for:

- Missing authorization checks
- Broken access control
- IDOR vulnerabilities
- Horizontal privilege escalation
- Vertical privilege escalation
- Client-controlled roles
- Missing ownership checks
- Unauthorized document access
- Unauthorized history access
- Unauthorized exports
- Administrative endpoints exposed to normal users

Authorization must be enforced on the backend.

Frontend hiding is not an authorization control.

---

### 3. Input Validation and Injection

Inspect all user-controlled input:

- Request body
- Query parameters
- Route parameters
- Headers
- Uploaded filenames
- Uploaded file content
- OCR text
- LLM-generated output
- Database filters
- External API responses

Check for:

- SQL injection
- NoSQL injection
- Command injection
- Code injection
- Template injection
- Path traversal
- Prototype pollution
- Regular-expression denial of service
- Server-side request forgery
- Open redirects
- Unsafe deserialization
- Mass assignment
- Unsafe dynamic property access

Verify:

- Allow-list validation
- Type validation
- Length limits
- Range limits
- Schema validation
- Rejection of unexpected fields

---

### 4. API Security

Check:

- Authentication on every protected endpoint
- Authorization on every protected resource
- Request-size limits
- Rate limiting
- Pagination limits
- Filtering and sorting validation
- Correct HTTP methods
- Correct status codes
- Consistent error responses
- Excessive data exposure
- Mass assignment
- Missing object ownership validation
- Sensitive information in responses
- Internal implementation details in responses
- Unsafe CORS configuration
- Missing API versioning where relevant
- Replay risks for sensitive operations

---

### 5. File Upload and Document Processing

This project processes invoices, receipts, PDFs, and images.

Check:

- Maximum file size
- Maximum page count
- Allowed extensions
- MIME-type validation
- File-signature validation
- Filename sanitization
- Randomized stored filenames
- Path traversal through filenames
- Executable files disguised as documents
- Polyglot files
- Malformed PDFs
- Password-protected PDFs
- Decompression bombs
- Image bombs
- Excessive-resolution images
- Infinite or expensive parsing behavior
- Temporary-file cleanup
- Storage outside the public web root
- Publicly guessable file URLs
- Cross-user document access
- Malware scanning strategy
- Sandboxing of document-processing tools
- Timeouts and memory limits
- Safe handling of external OCR tools

Do not trust file extensions or client-provided MIME types alone.

---

### 6. OCR and LLM Security

Treat OCR text and document content as untrusted input.

Check for:

- Prompt injection inside documents
- Hidden text instructions
- White-on-white text
- Tiny or off-page text
- Image-based prompt injection
- Prompt leakage
- System-prompt disclosure
- Model output used without validation
- Invalid or unexpected JSON
- Additional fields inserted by the model
- Hallucinated values
- Untrusted text reaching logs or HTML
- Token-exhaustion attacks
- Cost-amplification attacks
- Unlimited retries
- Missing timeouts
- Missing model-response size limits
- Sensitive document data sent to unnecessary third parties
- Cross-customer data leakage
- Training or retention settings that conflict with privacy requirements

Required controls:

- Clear separation between instructions and document data
- Strict output schema
- Server-side validation
- Allow-listed output fields
- Numeric and date validation
- Rejection of malformed responses
- Cost and usage limits
- Safe retry policy
- No direct execution of model-generated content

---

### 7. Frontend Security

Check for:

- Stored XSS
- Reflected XSS
- DOM-based XSS
- Unsafe `dangerouslySetInnerHTML`
- Rendering unsanitized OCR or LLM output
- Tokens stored insecurely
- Sensitive data in localStorage
- Secrets bundled into frontend code
- Client-only authorization
- Sensitive information in error messages
- Open redirects
- Unsafe external links
- Missing `rel="noopener noreferrer"`
- Clickjacking exposure
- Sensitive data cached in the browser
- Debug information in production

---

### 8. Database Security

Check:

- NoSQL injection
- Unsafe dynamic MongoDB queries
- Dangerous operators from user input
- Missing schema validation
- Missing ownership filters
- Sensitive fields returned by default
- Plaintext sensitive data
- Weak database credentials
- Excessive database privileges
- Publicly exposed database
- Missing connection encryption
- Missing backups
- Missing retention rules
- Missing deletion behavior
- Unsafe migrations
- Race conditions
- Missing transactions for multi-step critical operations
- Duplicate or inconsistent security-related data

---

### 9. Secrets and Configuration

Search for:

- API keys
- Database credentials
- JWT secrets
- Cloud credentials
- Private keys
- OAuth secrets
- SMTP credentials
- Hardcoded passwords
- Tokens in source code
- Secrets in test files
- Secrets in logs
- Secrets in Git history
- Production secrets in frontend environment variables

Verify:

- Secrets are loaded from environment variables or a secret manager
- `.env` is ignored by Git
- `.env.example` contains placeholders only
- Different environments use different secrets
- Secrets can be rotated
- Production uses strong random values
- Default credentials are removed

Never print or reproduce real secret values in the report.

Redact discovered secrets.

---

### 10. Cryptography and Data Protection

Check:

- HTTPS enforcement
- TLS certificate validation
- Strong password hashing
- Secure random generation
- Encryption of sensitive data where necessary
- Secure key storage
- Weak or deprecated algorithms
- Hardcoded encryption keys
- Reused initialization vectors
- Custom cryptography
- Sensitive data in URLs
- Sensitive data sent to third-party services
- Data minimization
- Data retention
- Secure deletion where required

---

### 11. Privacy and GDPR

Identify personal and confidential data, including:

- Names
- Addresses
- Email addresses
- Telephone numbers
- Customer identifiers
- Invoice data
- Financial data
- Uploaded documents
- OCR output
- IP addresses
- Usage logs

Check:

- Data minimization
- Clear purpose limitation
- Retention period
- User deletion flow
- Data export flow
- Access restrictions
- Audit trail
- Third-party processors
- Consent where required
- Privacy notice support
- Cross-border processing risks
- Sensitive data in logs
- Production data used in development or testing

Do not declare legal compliance as guaranteed.

Report technical observations and areas requiring legal review.

---

### 12. Logging, Monitoring, and Audit Trail

Check:

- Passwords in logs
- Tokens in logs
- API keys in logs
- Full uploaded documents in logs
- Full OCR text in logs
- Personal or financial data in logs
- Stack traces exposed to users
- Missing security-event logging
- Missing authentication-event logging
- Missing administrative-action logging
- Log injection
- Unbounded log growth
- Missing retention policy
- Missing alerting for suspicious behavior
- Missing correlation IDs

Security logs should be useful without exposing secrets or unnecessary personal data.

---

### 13. Error Handling

Check:

- Internal stack traces exposed
- Database errors exposed
- File-system paths exposed
- Framework versions exposed
- Model-provider errors exposed
- Inconsistent error formats
- Errors swallowed silently
- Sensitive request data included in errors
- Missing cleanup after failures
- Partial writes after errors
- Unsafe fallback behavior

---

### 14. Dependencies and Supply Chain

Review:

- Known vulnerable packages
- Outdated security-critical packages
- Unused dependencies
- Duplicate dependencies
- Unmaintained packages
- Install scripts
- Typosquatting risks
- Lockfile presence
- Lockfile consistency
- Dependency pinning
- Package integrity
- License concerns
- Vulnerable transitive dependencies

Use available package-audit tools when permitted.

Do not automatically upgrade major versions without assessing breaking changes.

---

### 15. Deployment and Infrastructure

Check:

- HTTPS
- CORS
- Content Security Policy
- HSTS
- Security headers
- Reverse-proxy trust settings
- Publicly exposed internal services
- Publicly exposed database
- Debug mode in production
- Source maps in production
- Environment separation
- Container running as root
- Excessive container privileges
- Writable application directories
- Missing health checks
- Missing backups
- Missing restore testing
- Missing monitoring
- Missing alerting
- Missing rollback plan
- Missing resource limits
- Missing request timeouts
- Missing process restart policy

---

### 16. Availability and Abuse Resistance

Check:

- Missing rate limits
- Unlimited uploads
- Unlimited batch size
- Unlimited PDF pages
- Unlimited OCR processing
- Unlimited LLM usage
- Unlimited export generation
- Expensive unauthenticated endpoints
- Missing concurrency limits
- Missing request timeouts
- Missing job cancellation
- Memory exhaustion risks
- CPU exhaustion risks
- Storage exhaustion risks
- Retry storms
- Queue overload
- Third-party API cost abuse

---

## Audit Method

Follow this sequence:

1. Map the architecture and trust boundaries.
2. Identify sensitive data and high-value operations.
3. Identify all external inputs.
4. Trace authentication and authorization.
5. Trace document upload and processing.
6. Trace OCR and LLM data flow.
7. Inspect database access.
8. Inspect secrets and configuration.
9. Inspect dependencies and deployment.
10. Produce evidence-based findings.
11. Prioritize remediation.
12. Give a final production-readiness verdict.

Do not start by rewriting code.

---

## Evidence Rules

Every finding must include concrete evidence.

Use:

- File path
- Function or class name
- Endpoint
- Relevant code behavior
- Configuration name
- Line number when available

Do not report a vulnerability based only on speculation.

When a risk is plausible but not confirmed, label it:

`Needs verification`

When a control cannot be inspected, label it:

`Not verifiable from provided context`

---

## Severity Model

### Critical

A vulnerability that can directly lead to:

- Remote code execution
- Full account takeover
- Unrestricted access to all customer documents
- Production secrets compromise
- Complete database compromise
- Large-scale personal-data exposure

### High

A vulnerability that can lead to:

- Privilege escalation
- Unauthorized access to another user's documents
- Authentication bypass
- Stored XSS affecting privileged users
- Significant sensitive-data exposure
- Serious denial of service
- Major LLM cost abuse

### Medium

A vulnerability that:

- Requires specific conditions
- Has limited impact
- Weakens a security boundary
- Exposes internal information
- Enables moderate abuse

### Low

A defense-in-depth weakness with limited direct impact.

### Informational

A recommendation, positive observation, or non-exploitable improvement.

---

## Required Output Format

# Security Audit Report

## 1. Executive Summary

- Audited scope:
- Overall risk:
- Production readiness:
- Critical findings:
- High findings:
- Medium findings:
- Low findings:
- Areas not reviewed:
- Most urgent action:

Do not invent a numerical security score unless a scoring methodology was explicitly provided.

---

## 2. System and Trust-Boundary Overview

Describe:

- Main components
- External services
- Sensitive data
- Entry points
- Trust boundaries
- High-value operations

---

## 3. Findings

For each finding use this exact structure:

### [SEVERITY] Finding title

**Category:**  
Authentication / Authorization / Injection / Upload / LLM / Privacy / Configuration / Other

**Affected area:**  
File, function, endpoint, service, or configuration.

**Evidence:**  
Describe the concrete code or configuration evidence.

**Risk:**  
Explain what could happen.

**Attack scenario:**  
Describe a realistic defensive threat scenario without providing harmful exploitation instructions.

**Recommendation:**  
Describe the smallest secure correction.

**Verification:**  
Explain how to verify that the issue is fixed.

---

## 4. Positive Security Controls

List security controls that are correctly implemented.

Examples:

- Strong server-side authorization
- Strict schema validation
- Safe upload limits
- Secure cookie settings
- Correct secret handling
- Safe LLM-output validation

---

## 5. Prioritized Remediation Plan

### Fix immediately

Critical and high-risk issues.

### Fix before production

Medium-risk issues and missing essential controls.

### Improve after release

Low-risk and defense-in-depth improvements.

For every item include:

- Priority
- Affected area
- Recommended owner
- Estimated complexity: Small / Medium / Large
- Dependencies

---

## 6. Production Readiness Verdict

Choose one:

- Not ready for production
- Ready only after listed blocking fixes
- Ready for limited controlled release
- Ready for production based on reviewed scope

Explain the verdict.

---

## 7. Verification Checklist

Provide a checklist for re-auditing the fixes.

---

## Constraints

- Do not modify code unless explicitly requested.
- Do not make unrelated refactors.
- Do not expose real secrets.
- Do not claim that the application is fully secure.
- Do not claim legal compliance.
- Do not treat frontend checks as authorization.
- Do not trust OCR text, documents, filenames, or LLM output.
- Do not report speculative issues as confirmed vulnerabilities.
- Prefer minimal, targeted remediation.
- Preserve current business behavior unless it is insecure.