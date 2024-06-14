import { createClient } from "redis";

export const redisClient = createClient({
  password: process.env.REDIS_PASS,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 10305,
  },
});

redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("disconnect", () => console.log("Disconnected from Redis"));
redisClient.on("error", function (error) {
  console.error(error);
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
};

export const getCachedContact = async (key: string) => {
  await connectRedis();
  const cachedContact = await redisClient.get(key);
  await disconnectRedis();
  return cachedContact ? JSON.parse(cachedContact) : null;
};

export const setCachedContact = async (key: string, value: any) => {
  await connectRedis();
  await redisClient.set(key, JSON.stringify(value));
  await disconnectRedis();
};
