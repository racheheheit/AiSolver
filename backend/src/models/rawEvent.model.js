const mongoose = require("mongoose");

const rawEventSchema = new mongoose.Schema(
    {
        deliveryId: {
            type: String,
            required: true,
            unique: true
        },

        eventType: {
            type: String,
            required: true
        },

        repository: {
            owner: {
                type: String,
                required: true
            },

            name: {
                type: String,
                required: true
            },

            fullName: {
                type: String,
                required: true
            }
        },

        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        headers: {
            githubEvent: String,
            githubDelivery: String,
            signature: String
        },

        receivedAt: {
            type: Date,
            default: Date.now
        },

        processed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const RawEvent = mongoose.model("RawEvent", rawEventSchema);

module.exports = RawEvent;