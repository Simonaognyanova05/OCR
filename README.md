# OCR Документи

Production-ready MVP за OCR обработка на фактури и касови бележки чрез OpenAI vision, строг JSON schema формат, MongoDB и експорт към Excel/PDF.

## Структура

```text
backend/   Express API, OpenAI извличане, MongoDB, review правила, експорти
frontend/  React приложение, създадено с npx create-react-app
```

Backend структура:

```text
backend/src/app.js                 Express app setup
backend/src/server.js              стартова точка на сървъра
backend/src/config/                настройки и връзка с базата
backend/src/controllers/           request/response handlers
backend/src/routes/                API routes
backend/src/services/              бизнес логика
backend/src/models/                Mongoose модели и OCR schema
backend/src/middleware/            Express middleware
backend/src/utils/                 общи помощни функции
```

Backend-ът използва CommonJS (`require` / `module.exports`).

## MVP Цел

Първата версия следва един ясен сценарий:

```text
Потребителят качва фактура/касова бележка
-> системата извлича счетоводни данни
-> потребителят преглежда и коригира полетата
-> потребителят експортира Excel/PDF
```

Фокусът е върху:

- малки фирми
- счетоводни къщи
- самонаети лица
- онлайн магазини

OCR извлича:

- номер на фактура/касова бележка
- дата
- доставчик
- получател
- ДДС
- суми
- валута
- начин на плащане
- редове/артикули, когато са четими

## Модул 1: Потребители И Фирми

Добавени са:

- регистрация и вход
- фирмен профил
- роли: `owner`, `accountant`, `employee`
- месечен лимит на документи според плана
- колекции: `User`, `Company`, `Membership`

Планове и лимити:

```text
free      50 документа / месец
starter   200 документа / месец
pro       1000 документа / месец
business  5000 документа / месец
```

Документите вече се записват към конкретна фирма и потребител. OCR, прегледът и експортите изискват `Authorization: Bearer <token>`.

## Модул 2: Качване На Документи

Поддържани файлове:

- PDF
- JPG/JPEG
- PNG

Frontend-ът поддържа стандартен mobile upload през file input и drag & drop на desktop. Има два сценария:

- `Само качи` записва файла със статус `uploaded`
- `Извлечи данни` качва файла и стартира OCR обработка за PDF/JPG/PNG

PDF файловете се конвертират до PNG изображения чрез Python + PyMuPDF преди да се изпратят към AI. Конверторът използва PDF rotation metadata и в `auto` режим завърта landscape страници към portrait, което покрива най-честия случай при сканирани фактури. Prompt-ът към AI също указва, че изображенията може да са завъртени.

При upload се записва документ с основните полета:

```text
Document {
  companyId,
  uploadedBy,
  originalFileName,
  fileUrl,
  status: "uploaded",
  documentType: null,
  createdAt
}
```

Статуси:

```text
uploaded
processing
needs_review
approved
exported
failed
```

## Настройка

1. Инсталирай backend зависимостите:

```powershell
npm install --prefix backend
```

2. Инсталирай frontend зависимостите:

```powershell
npm install --prefix frontend
```

3. Създай `backend/.env` от примерния файл:

```powershell
Copy-Item backend\.env.example backend\.env
```

4. По желание създай `frontend/.env`, за да стартира React на порт 3001:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

5. Попълни ключовете в `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_FALLBACK_MODEL=gpt-5.5
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ocr-documents
PDF_FONT_REGULAR_PATH=C:\Windows\Fonts\arial.ttf
PDF_FONT_BOLD_PATH=C:\Windows\Fonts\arialbd.ttf
PYTHON_COMMAND=py
PDF_RENDER_DPI=200
PDF_MAX_PAGES=5
```

## Стартиране

Backend:

```powershell
npm run backend:dev
```

Frontend:

```powershell
npm run frontend:dev
```

Отвори:

```text
http://localhost:3001
```

Frontend-ът използва `fetch` към backend-а на:

```text
http://localhost:3000
```

## API Проверки

Health check:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Регистрация:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/auth/register `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"name":"Иван Иванов","email":"ivan@example.com","password":"password123","company_name":"Моята фирма"}'
```

Вход:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"ivan@example.com","password":"password123"}'
```

Фирмен профил:

```text
GET  http://localhost:3000/api/company
PUT  http://localhost:3000/api/company
GET  http://localhost:3000/api/company/memberships
POST http://localhost:3000/api/company/memberships
```

Само качване на документ:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/documents/upload `
  -Method Post `
  -Headers @{ Authorization = "Bearer <token>" } `
  -Form @{ document = Get-Item .\samples\invoice.pdf }
```

Извличане на документ:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/documents/extract `
  -Method Post `
  -Headers @{ Authorization = "Bearer <token>" } `
  -Form @{ document = Get-Item .\samples\invoice.jpg }
```

Прочитане на запазен резултат:

```powershell
Invoke-RestMethod http://localhost:3000/api/documents/<document-id>
```

Експорт:

```text
GET http://localhost:3000/api/documents/<document-id>/export/excel
GET http://localhost:3000/api/documents/<document-id>/export/pdf
```

## Бележка За Полетата

Потребителските етикети, Excel/PDF експортите и съобщенията са на български. Вътрешните JSON/MongoDB ключове остават на английски, защото те са технически договор между frontend, backend, schema и базата.
