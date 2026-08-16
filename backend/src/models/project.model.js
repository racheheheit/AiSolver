const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    repositoryOwner : {
        type: String,
        required: true,
        trim: true
    },

    repositoryName : {
        type: String,
        required: true,
        trim: true
    },

    enabled :{
        type: Boolean,
        default: true
    },
   
},
 {
        timestamps: true
    }
);

projectSchema.index({
    repositoryOwner: 1,
    repositoryName: 1
}, {
    unique: true
})
const Project = mongoose.model('Project', projectSchema);
module.exports = Project;