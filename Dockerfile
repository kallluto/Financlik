FROM node:24.16.0
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "bot.js"]
