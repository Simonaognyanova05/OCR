# OCR Документи

Production-ready MVP за OCR обработка на фактури и касови бележки чрез OpenAI vision, строг JSON schema формат, MongoDB и експорт към Excel/PDF.

## Структура

```text
backend/   Express API, OpenAI извличане, MongoDB, review правила, експорти
frontend/  React приложение, създадено с npx create-react-app
```

Frontend структура:

```text
frontend/src/components/  UI компоненти
frontend/src/services/    fetch заявки към backend-а
frontend/src/hooks/       преизползваема state и async логика
frontend/src/utils/       форматиране, form helpers, localStorage helpers
frontend/src/constants/   етикети и текстове за статуси/предупреждения
frontend/src/config/      API конфигурация
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

## Модул 3: OCR + AI Извличане

Pipeline:

```text
Upload
-> OCR / Vision model
-> AI extraction
-> JSON validation чрез strict schema
-> Save extracted data
-> Needs review или approved
```

AI извлича и записва:

```json
{
  "documentType": "invoice | receipt",
  "documentNumber": "string | null",
  "issueDate": "string | null",
  "supplierName": "string | null",
  "supplierVatNumber": "string | null",
  "recipientName": "string | null",
  "recipientVatNumber": "string | null",
  "totalAmount": "number | null",
  "vatAmount": "number | null",
  "netAmount": "number | null",
  "currency": "BGN | EUR | USD | null",
  "paymentMethod": "cash | card | bank_transfer | unknown",
  "category": "string | null",
  "items": [
    {
      "name": "string",
      "quantity": "number | null",
      "unitPrice": "number | null",
      "totalPrice": "number | null"
    }
  ],
  "confidence": "number"
}
```

Backend-ът добавя `needsReview` и `reviewReasons` след валидацията. Ако липсват важни полета или `confidence < 0.75`, документът остава със статус `needs_review`.

## Модул 4: Проверка От Потребителя

След AI извличането документът винаги остава за човешка проверка и не се счита директно за готов.

Екранът за преглед показва:

- лява страна: оригинален документ
- дясна страна: извлечени полета

Потребителят може да коригира:

- дата
- доставчик
- получател
- сума
- ДДС
- начин на плащане
- категория

Ако липсва важно поле, frontend-ът показва предупреждение, например:

```text
⚠ Липсва дата
⚠ Липсва сума
⚠ Липсва доставчик
```

След преглед потребителят натиска `Approve document`, което извиква:

```text
POST /api/documents/<document-id>/approve
```

Едва тогава статусът става `approved`.

## Модул 5: Списък С Документи

Добавен е списък с документи за текущата фирма:

```text
GET /api/documents
```

Таблицата показва:

```text
Дата | Тип | Доставчик | Получател | Сума | ДДС | Статус | Категория
```

Поддържани филтри:

- период: `dateFrom`, `dateTo`
- доставчик: `supplier`
- получател: `recipient`
- сума: `amountMin`, `amountMax`
- валута: `currency`
- категория: `category`
- статус: `status`
- тип документ: `documentType`

Пример:

```text
GET /api/documents?dateFrom=2026-01-01&dateTo=2026-01-31&status=approved&currency=BGN
```

Във frontend-а ред от таблицата може да се отвори директно в review екрана.

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

## Модул 6: Експорти

Excel export-ът е счетоводна таблица с един ред за документа и следните колони:

```text
Дата | Тип документ | Номер | Доставчик | ЕИК/ДДС номер доставчик | Получател | ЕИК/ДДС номер получател | Основа | ДДС | Обща сума | Валута | Начин на плащане | Категория
```

Файлът се генерира от:

```text
GET /api/documents/<document-id>/export/excel
```

PDF отчетът за месец се генерира от:

```text
GET /api/reports/monthly/pdf?month=2026-06
```

Отчетът включва само документи със статус `approved` или `exported` за избрания месец и показва:

- общо документи
- обща сума
- общо ДДС
- най-голям доставчик
- разходи по категории
- списък с документи

## Модул 7: Dashboard

Dashboard-ът показва бизнес метрики за текущия месец върху одобрени/експортирани документи:

- общо разходи този месец
- общо ДДС
- брой документи
- топ 5 доставчици
- разходи по категории

Данните се зареждат от:

```text
GET /api/dashboard
```

## Модул 8: Автоматични Проверки

След OCR извличане и след ръчна корекция backend-ът прилага счетоводни проверки:

- ако няма дата, документът остава `needs_review`
- ако няма сума, документът остава `needs_review`
- ако няма доставчик, документът остава `needs_review`
- ако `totalAmount` не съвпада с `netAmount + vatAmount`, се добавя warning `amount_mismatch`
- ако вече има документ със същия номер, доставчик и сума за същата фирма, се добавя warning `possible_duplicate`

Warning-ите не блокират автоматично approve, но се показват в review екрана и в PDF export-а.

## Бележка За Полетата

Потребителските етикети, Excel/PDF експортите и съобщенията са на български. Вътрешните JSON/MongoDB ключове остават на английски, защото те са технически договор между frontend, backend, schema и базата.
