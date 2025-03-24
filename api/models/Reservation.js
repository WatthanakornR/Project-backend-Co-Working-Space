// const mongoose = require('mongoose');
// const Room = require('./CoWorkingSpace');
// const User = require('./User');

// const ReservationSchema = new mongoose.Schema({
//     user: {
//         type: mongoose.Schema.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     coworkingspace: {
//         type: mongoose.Schema.ObjectId,
//         ref: 'CoWorkingSpace',
//         required: true
//     },
//     startTime: {
//         type: Date,
//         required: true
//     },
//     endTime: {
//         type: Date,
//         required: true
//     },
//     room_number: {
//         type: Number,
//         required: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     updateAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// module.exports = mongoose.model('Reservation', ReservationSchema);
const mongoose = require('mongoose');
const Room = require('./CoWorkingSpace');
const User = require('./User');

const ReservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    coworkingspace: {
        type: mongoose.Schema.ObjectId,
        ref: 'CoWorkingSpace',
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return this.endTime && value < this.endTime;
            },
            message: 'Start time must be before end time.'
        }
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return this.startTime && value > this.startTime;
            },
            message: 'End time must be after start time.'
        }
    },
    room_number: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updateAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update 'updateAt' on save
ReservationSchema.pre('save', function (next) {
    this.updateAt = new Date();
    next();
});

// Optional: Add index for performance (if you're querying a lot by room/time)
ReservationSchema.index({ coworkingspace: 1, room_number: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', ReservationSchema);
