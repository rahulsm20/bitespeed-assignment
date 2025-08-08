# Identity Reconciler Service

- This has been dockerized and deployed on GCP Cloud Run here - [Link](https://identity-reconciler-service-yx2x2yqpua-uw.a.run.app)

### Index

- [Tech Stack](#tech-stack)
- [System Design](#system-design)
- [Setup locally](#setup-locally)

### Tech Stack

- Node.js
- Express.js
- Typescript
- PrismaORM
- PostgreSQL
- Docker
- GCP Cloud Run

### System Design

![system-design](./images/identity.PNG)

### Setup locally

- Clone repo

  ```
  git clone https://github.com/rahulsm20/bitespeed-assignment
  ```

- Install packages

  ```
  cd bitespeed-assignment && npm i
  ```

- Setup env variables

  ```
  DIRECT_URL=""
  DATABASE_URL=""
  PORT=3000
  ```

- Run prisma migrations

  ```
  npx prisma migrate deploy
  ```

- Run in dev mode

  ```
  npm run dev
  ```

  OR

- Run using docker

  ```
    docker build -t bitespeed-server . && docker run -p 3000:3000 bitespeed-server
  ```
