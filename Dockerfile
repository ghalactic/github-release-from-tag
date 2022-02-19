FROM node:16
COPY . .
RUN yarn install --production
ENTRYPOINT ["node", "/src/main.js"]
