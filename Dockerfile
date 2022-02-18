FROM node:16-slim
COPY . .
RUN yarn install --production
ENTRYPOINT ["node", "/src/main.js"]
