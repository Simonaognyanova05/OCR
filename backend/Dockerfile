FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    clamav \
    clamav-freshclam \
    fonts-dejavu-core \
    python3 \
    python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY requirements.txt ./
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x scripts/render-start.sh
RUN freshclam --stdout || true

EXPOSE 3000

CMD ["./scripts/render-start.sh"]
