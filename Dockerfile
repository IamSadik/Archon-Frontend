FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
