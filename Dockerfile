FROM node:19
COPY . .
RUN yarn install --production
ENTRYPOINT ["node", "/src/main.js"]
