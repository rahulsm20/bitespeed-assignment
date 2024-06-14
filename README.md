# Identity Reconciler Service

- This has been dockerized and deployed on GCP Cloud Run here - [Link](https://bitespeed-yx2x2yqpua-uw.a.run.app/)

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
- Redis
- Docker
- GCP Cloud Run

### System Design

![system-design](./images/identity.PNG)

- Features
  - Redis for caching requests
    - Reduced subsequent response time from an average of ~3000ms to ~400ms i.e an 86% decrease.
  - Containerization
    - Used Docker to containerize application which helps in ease of deployment, development and future scaling.

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
  REDIS_HOST=""
  REDIS_PASS=""
  REDIS_PORT=""
  PORT=3000
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
