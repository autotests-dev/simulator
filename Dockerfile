# Build the static site, then serve it from nginx. Nothing runs at request time
# except a static file server — the "backend" is Mock Service Worker in the browser.

FROM node:26-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM nginx:1.31-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/site/dist /usr/share/nginx/html
EXPOSE 80
