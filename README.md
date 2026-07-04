# OCR Finance

MVP приложение за OCR обработка на фактури и касови бележки.

Потребителят качва PDF/JPG/PNG документ, системата извлича счетоводни данни с AI, документът минава през човешка проверка, записва се в MongoDB и може да се експортира към Excel/PDF.

## Структура

```text
backend/   Express API, MongoDB, OpenAI extraction, exports, PDF -> image converter
frontend/  React приложение, създадено с npx create-react-app
```

Backend-ът е CommonJS и е разделен на:

```text
backend/src/config/
backend/src/controllers/
backend/src/middleware/
backend/src/models/
backend/src/routes/
backend/src/services/
backend/src/utils/
```

Frontend-ът е разделен на:

```text
frontend/src/components/
frontend/src/hooks/
frontend/src/pages/
frontend/src/services/
frontend/src/utils/
frontend/src/config/
frontend/src/constants/
```

## Локално стартиране

Създай `backend/.env` ръчно и добави:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.4-mini
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ocr-finance?retryWrites=true&w=majority&appName=Cluster0
AUTH_SECRET=change-this-secret
PORT=3000
PYTHON_COMMAND=py
PDF_RENDER_DPI=200
PDF_MAX_PAGES=5
```

Стартиране:

```bash
npm install --prefix backend
npm install --prefix frontend
npm run backend:start
npm run frontend:dev
```

Frontend-ът по подразбиране прави заявки към:

```text
http://localhost:3000
```

Ако искаш друг backend URL, създай `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:3000
```

## Render deploy

Проектът има `render.yaml`, който подготвя два service-а:

- `ocr-finance-backend`
- `ocr-finance-frontend`

В Render избери:

```text
New + -> Blueprint
```

и свържи GitHub repo-то.

### Backend env vars в Render

Добави стойности за:

```text
OPENAI_API_KEY
MONGODB_URI
CORS_ORIGINS
```

`AUTH_SECRET` се генерира автоматично от Render blueprint-а.

Пример за `CORS_ORIGINS`:

```text
https://ocr-finance-frontend.onrender.com
```

Ако имаш повече от един origin:

```text
https://ocr-finance-frontend.onrender.com,http://localhost:3001
```

### Frontend env vars в Render

Добави:

```text
REACT_APP_API_URL=https://ocr-finance-backend.onrender.com
```

След промяна на `REACT_APP_API_URL` трябва нов deploy/build на frontend-а.

## MongoDB Atlas

В Atlas провери:

- `Database Access` има потребител с правилна парола.
- `Network Access` допуска Render.
- За бърз MVP тест може временно да добавиш `0.0.0.0/0`.
- URI-то трябва да съдържа име на база, например `/ocr-finance`.

## Важна production бележка

Render filesystem-ът не е постоянен storage. За production файловете от `uploads/` и `outputs/` трябва да се преместят към S3, Cloudinary или друг object storage.

За MVP deploy е достатъчно, но при restart/redeploy качените файлове може да се изгубят.
