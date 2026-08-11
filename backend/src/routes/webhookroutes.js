const express= require('express')
const router = express.Router()
router.post("/github", (req,res)=>{
    console.log("Github Webhook received");
    console.log(req.body);

    res.sendStatus(200);
});
module.exports = router;
