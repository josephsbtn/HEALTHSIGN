# Tahap 1: Build aplikasi React/Vite
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Tahap 2: Gunakan Nginx untuk melayani file hasil build
FROM nginx:stable-alpine
# Copy hasil build dari tahap 1 ke folder Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Proxy API dan WebSocket ke backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Jalankan Nginx
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]