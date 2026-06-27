# OCR Documents

Production-oriented OCR pipeline for invoices and receipts using OpenAI vision + strict JSON schema.

## Project Structure

```text
backend/   Express API, OpenAI extraction, review rules
frontend/  React app created with create-react-app
```

Backend structure:

```text
backend/src/app.js                 Express app setup
backend/src/server.js              Server entrypoint
backend/src/config/                Environment/config loading
backend/src/controllers/           Request/response handlers
backend/src/routes/                API routes
backend/src/services/              Business logic
backend/src/models/                Data and schema definitions
backend/src/middleware/            Express middleware
backend/src/utils/                 Shared helpers
```

The backend uses CommonJS (`require` / `module.exports`).

## Product Scope

The first scenario is focused on invoices and receipts for:

- small businesses
- accounting offices
- freelancers
- online stores

The extractor targets:

- invoice or receipt number
- issue date
- supplier
- recipient
- VAT
- totals
- currency
- payment method

Next outputs planned for this scenario:

- Excel
- ERP/accounting system
- PDF report

## MVP Goal

The first version follows one focused workflow:

```text
User uploads invoice/receipt
-> system extracts accounting data
-> user reviews and corrects the fields
-> user exports Excel/PDF
```

Current implementation status:

- Upload image document: done
- Extract structured data: done
- Review and correct extracted fields: in progress
- Export Excel/PDF: planned next

## Setup

1. Install backend dependencies:

```powershell
npm install --prefix backend
```

2. Install frontend dependencies:

```powershell
npm install --prefix frontend
```

3. Create `backend/.env` from the backend example:

```powershell
Copy-Item backend\.env.example backend\.env
```

4. Optional: create `frontend/.env` so React starts on port 3001:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

5. Add your API key:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_FALLBACK_MODEL=gpt-5.5
```

## Run CLI

Start with an image file:

```powershell
npm run backend:extract -- .\samples\invoice.jpg
```

The result is printed in the terminal and saved to `outputs/<file-name>.json`.

Supported starter formats: PNG, JPG, JPEG, WEBP.

PDF support can be added next by converting pages to images before extraction.

## Run Backend

Start the API:

```powershell
npm run backend:dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Extract a document:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/documents/extract `
  -Method Post `
  -Form @{ document = Get-Item .\samples\invoice.jpg }
```

Read a saved result:

```powershell
Invoke-RestMethod http://localhost:3000/api/documents/<document-id>
```

## Run Frontend

Start the React app created with `npx create-react-app`:

```powershell
npm run frontend:dev
```

Open:

```text
http://localhost:3001
```

The frontend uses `fetch` to call the backend at `http://localhost:3000`.
