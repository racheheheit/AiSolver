const express = require('express')
require('dotenv').config();
const app = express()
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === "/webhook/github") {
            req.rawBody = buf;
        }
    }
}));


const webhookRoutes = require("./routes/webhookroutes");
app.use("/webhook", webhookRoutes);
app.get("/" , (req,res)=>{
    res.send("Server is running")
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});