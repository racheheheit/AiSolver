const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (error) => {
    console.error("Redis connection error:", error.message);
});

module.exports = redis;