# Stage 1: Build the static assets
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (caching layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source and build
COPY . .
RUN npm run build

# Stage 2: Serve the application
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the custom Nginx template
# The official nginx:alpine image automatically runs envsubst on files in /etc/nginx/templates/*.template
# and outputs them to /etc/nginx/conf.d/*.conf before starting nginx.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set the default backend URL, which can be overridden at runtime
ENV BACKEND_URL=http://lens-backend:8000

# Expose port 80
EXPOSE 80

# The default CMD of nginx:alpine is sufficient
