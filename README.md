# OCR Documents

Starter OCR pipeline for invoices, receipts, and expense documents using OpenAI vision + strict JSON schema.

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create `.env` from the example:

```powershell
Copy-Item .env.example .env
```

3. Add your API key:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_FALLBACK_MODEL=gpt-5.5
```

## Run CLI

Start with an image file:

```powershell
npm run extract -- .\samples\invoice.jpg
```

The result is printed in the terminal and saved to `outputs/<file-name>.json`.

Supported starter formats: PNG, JPG, JPEG, WEBP.

PDF support can be added next by converting pages to images before extraction.

## Run Backend

Start the API:

```powershell
npm run dev
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
