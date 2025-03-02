const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    reservation: {
        type: mongoose.Schema.ObjectId,
        ref: 'Reservation',
        required: true
    },
    action: {
        type: String,
        enum: ['create', 'update', 'delete'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('Log', LogSchema);