FROM node:18-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget gnupg openssl \
    fonts-liberation libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 libasound2 libatk1.0-0 libcups2 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    chromium \
  && rm -rf /var/lib/apt/lists/*

# create symlink so executable path is predictable
RUN if [ -f /usr/bin/chromium ]; then ln -sf /usr/bin/chromium /usr/bin/chromium-browser || true; fi

WORKDIR /usr/src/app

# copy package files and install
COPY package*.json ./
RUN npm ci --omit=dev

# copy source
COPY . .

EXPOSE 3000

ENV PUPPETEER_CACHE_PATH=/root/.cache/puppeteer

CMD ["npm", "start"]
