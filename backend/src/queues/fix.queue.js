const {Queue} = require('bullmq')

const fixQueue = new Queue(
    "fix-queue", {
        connection: {
            url : process.env.REDIS_URL
        }
    }
);

module.exports = fixQueue;
