
FROM node:21.6-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:21.6-alpine

WORKDIR /app

COPY --from=build /app /app

RUN npm install --production

EXPOSE 3000

CMD ["npm", "start"]
