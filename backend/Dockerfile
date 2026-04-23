# Gunakan Node 20 agar sinkron dengan Frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files dulu untuk memanfaatkan layer caching
COPY package*.json ./

# Pakai install biasa karena package-lock kadang bermasalah di server
RUN npm install

# Copy semua source code
COPY . .

# Backend biasanya jalan di 8000
EXPOSE 8000

CMD ["npm", "start"]