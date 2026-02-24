# Stage 1: Build
FROM node:20-alpine as build
WORKDIR /app
ARG VITE_CONFIG_FILE=vite.config.prod.local.ts
COPY package*.json ./
RUN npm install
COPY . .
COPY ./${VITE_CONFIG_FILE} ./vite.config.ts
RUN npm run build

# Stage 2: Serve with Nginx
# Stage 2: Serve
FROM nginx:stable-alpine
ARG NGINX_CONFIG_FILE=nginx.local.conf
# Copy your build folder
COPY --from=build /app/dist /usr/share/nginx/html
# Copy your custom config
COPY ./${NGINX_CONFIG_FILE} /etc/nginx/conf.d/default.conf
# You might need a custom nginx.conf to handle React Router paths
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]