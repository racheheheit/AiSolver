const RawEvent = require("../models/rawEvent.model");

async function saveRawEvent(req) {
    const deliveryId = req.headers["x-github-delivery"];
    const eventType = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"];

    const { repository } = req.body;
    
    const existingEvent = await RawEvent.findOne({deliveryId});

    if(existingEvent){
        return {
            duplicate : true,
            event : existingEvent
        };
    }
    const rawEvent = new RawEvent({
        deliveryId,

        eventType,

        repository: {
            owner: repository?.owner?.login,
            name: repository?.name,
            fullName: repository?.full_name
        },

        payload: req.body,

        headers: {
            githubEvent: eventType,
            githubDelivery: deliveryId,
            signature
        }
    });

    const savedEvent = await rawEvent.save();

return {
    duplicate: false,
    event: savedEvent
};
}

module.exports = {
    saveRawEvent
};