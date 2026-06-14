FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

ARG VITE_API_BASE_URL=https://api.aryx.dev

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s|https://api.aryx.dev|${VITE_API_BASE_URL}|g" /etc/nginx/conf.d/default.conf

EXPOSE 80
