FROM node:18
COPY . .
RUN yarn install --production
ENTRYPOINT ["node", "/src/main.js"]
