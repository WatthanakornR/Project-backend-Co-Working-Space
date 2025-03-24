const Reservation = require('../models/Reservation');
const CoWorkingSpace = require('../models/CoWorkingSpace');
const Log = require('../models/Log');

// @desc    Get all reservations    
// @route   GET /api/v1/reservations
// @access  Private
exports.getReservations = async(req, res, next) => {
    let query;
    if(req.user.role !== 'admin'){
        query = Reservation.find({ user: req.user.id}).populate({
            path: 'coworkingspace',
            select: 'name location tel'
        });
    }
    else {
        query = Reservation.find().populate({   
            path: 'coworkingspace',
            select: 'name location tel'
        });
    }
    try{
        const reservations = await query;
        res.status(200).json({ success: true, count: reservations.length, data: reservations });
    }
    catch(err){
        console.log(err.stack);
        return res.status(500).json({ success: false, message:"Cannot find Reservation" });
    }
}

// @desc    Get single reservation
// @route   GET /api/v1/reservations/:id
// @access  Public
exports.getReservation = async(req, res, next) => {
    try{
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'coworkingspace',
            select: 'name location tel'
        });
        if(!reservation){
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}`});
        }
        res.status(200).json({ success: true, data: reservation });
    }
    catch(err){
        console.log(err.stack);
        return res.status(500).json({ success: false, message:"Cannot find Reservation" });
    }

}

// @desc    Add reservation
// @route   POST /api/v1/coworkingspace/:coworkingspaceId/reservations/
// @access  Private
exports.addReservation = async(req, res, next) => {

    try {
        // Add coworkingspace ID to the request body
        req.body.coworkingspace = req.params.coworkingspaceId || req.body.coworkingspace;


        const coworkingspace = await CoWorkingSpace.findById(req.body.coworkingspace);
        if (!coworkingspace) {
            return res.status(404).json({
                success: false,
                message: `No coworkingspace with the id of ${req.body.coworkingspace}`
            });
        }

        // convert string to Date object
        //  const startTime = new Date(req.body.startTime);
        //  const endTime = new Date(req.body.endTime);
 
        //  // split the time from the date object
        //  const startTimeString = startTime.toISOString().split('T')[1].substring(0, 5);
        //  const endTimeString = endTime.toISOString().split('T')[1].substring(0, 5);
 
        //  // check if the reservation time is within the opening hours of the coworking space
        //  if (startTimeString < coworkingspace.openTime || endTimeString > coworkingspace.closeTime) {
        //      return res.status(400).json({
        //          success: false,
        //          message: `Reservation time must be within the opening hours of the coworking space (${coworkingspace.openTime} - ${coworkingspace.closeTime})`
        //      });
        //  }
                    const moment = require('moment-timezone');

                    // convert ISO string to Date object
                    const startTime = new Date(req.body.startTime);
                    const endTime = new Date(req.body.endTime);

                    // Convert to Thai time (GMT+7)
                    const localStartTime = moment(startTime).tz("Asia/Bangkok");
                    const localEndTime = moment(endTime).tz("Asia/Bangkok");

                    // Extract just time portion (HH:mm)
                    const startTimeString = localStartTime.format('HH:mm');
                    const endTimeString = localEndTime.format('HH:mm');

                    // Check if within opening hours
                    if (
                    startTimeString < coworkingspace.openTime ||
                    endTimeString > coworkingspace.closeTime
                    ) {
                    return res.status(400).json({
                        success: false,
                        message: `Reservation time must be within the opening hours of the coworking space (${coworkingspace.openTime} - ${coworkingspace.closeTime})`
                    });
                    }

        

        req.body.user = req.user.id;

        const existedReservation = await Reservation.find({ user: req.user.id });
        if (existedReservation.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `User with ID ${req.user.id} has already made 3 reservations`
            });
        }

        // Overlapping reservation
        const overlappingReservations = await Reservation.find({
            coworkingspace: req.body.coworkingspace,
            room_number: req.body.room_number,
            $or: [
                { startTime: { $lt: endTime, $gt: startTime } },
                { endTime: { $lt: endTime, $gt: startTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
            ]
        });

        if (overlappingReservations.length > 0) {
            const overlappingTimes = overlappingReservations.map(reservation => {
                return `from ${reservation.startTime} to ${reservation.endTime}`;
            }).join(', ');

            return res.status(400).json({
                success: false,
                message: `The coworking space is already reserved for the selected time period. Overlapping reservations: ${overlappingTimes}`
            });
        }

        const reservation = await Reservation.create(req.body);

        // Create log
        await Log.create({
            user: req.user.id,
            reservation: reservation._id,
            action: 'create'
        });

        res.status(200).json({ success: true, data: reservation });

    } catch (err) {
        console.log(err.stack);
        return res.status(500).json({
            success: false,
            message: "Cannot add Reservation"
        });
    }
    
}

// // @desc    Update a reservation
// // @route   PUT /api/v1/reservations/:id
// // @access  Private
// exports.updateReservation = async(req, res, next) => {
//     try {
//         let reservation = await Reservation.findById(req.params.id);

//         if (!reservation) {
//             return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
//         }

//         // Make sure user is reservation owner
//         if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
//             return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this reservation` });
//         }

//         // Update reservation
//         reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

//         // Create log
//         await Log.create({
//             user: req.user.id,
//             reservation: reservation._id,
//             action: 'update'
//         });

//         res.status(200).json({ success: true, data: reservation });
//     } catch (err) {
//         console.log(err.stack);
//         return res.status(500).json({ success: false, message: "Cannot update Reservation" });
//     }
// }

exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        // Check permission
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this reservation`
            });
        }

        // Extract new times
        const { startTime, endTime } = req.body;
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Load coworking space data
        const coworkingspace = await CoWorkingSpace.findById(reservation.coworkingspace);
        if (!coworkingspace) {
            return res.status(404).json({
                success: false,
                message: `No coworkingspace with the id of ${reservation.coworkingspace}`
            });
        }

        const moment = require('moment-timezone');
        const localStartTime = moment(start).tz("Asia/Bangkok");
        const localEndTime = moment(end).tz("Asia/Bangkok");

        const startTimeStr = localStartTime.format('HH:mm');
        const endTimeStr = localEndTime.format('HH:mm');

        if (
            startTimeStr < coworkingspace.openTime ||
            endTimeStr > coworkingspace.closeTime
        ) {
            return res.status(400).json({
                success: false,
                message: `Reservation time must be within coworking space hours (${coworkingspace.openTime} - ${coworkingspace.closeTime})`
            });
        }

        // Check overlapping (excluding the current reservation itself)
        const overlaps = await Reservation.find({
            _id: { $ne: reservation._id },
            coworkingspace: reservation.coworkingspace,
            room_number: reservation.room_number,
            $or: [
                { startTime: { $lt: end, $gt: start } },
                { endTime: { $lt: end, $gt: start } },
                { startTime: { $lte: start }, endTime: { $gte: end } }
            ]
        });

        if (overlaps.length > 0) {
            const overlapDetails = overlaps.map(r => {
                return `from ${r.startTime} to ${r.endTime}`;
            }).join(', ');

            return res.status(400).json({
                success: false,
                message: `Time overlaps with another reservation: ${overlapDetails}`
            });
        }

        // Update only allowed fields
        const updatedFields = {
            startTime,
            endTime,
        };

        reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true, runValidators: true }
        );

        await Log.create({
            user: req.user.id,
            reservation: reservation._id,
            action: 'update'
        });

        res.status(200).json({ success: true, data: reservation });

    } catch (err) {
        console.error(err.stack);
        return res.status(500).json({
            success: false,
            message: "Cannot update Reservation"
        });
    }
};


// @desc    Delete a reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
exports.deleteReservation = async(req, res, next) => {
    try{
        const reservation = await Reservation.findById(req.params.id);

        if(!reservation){
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}`});
        }

        //Make sure user is reservation owner
        if(reservation.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this reservation`});
        }
        await Reservation.deleteOne({ _id: req.params.id });
        
        // Create log
        await Log.create({
            user: req.user.id,
            reservation: reservation._id,
            action: 'delete'
        });

        res.status(200).json({ success: true, data: {} });
    }
    catch(err){
        console.log(err.stack);
        return res.status(500).json({ success: false, message:"Cannot delete Reservation" });
    }

}


// @desc    Search reservations by time range
// @route   GET /api/v1/reservations/search
// @access  Private
exports.searchReservationsByTime = async (req, res, next) => {
    try {
        const { startTime, endTime } = req.query;

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both startTime and endTime'
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format for startTime or endTime'
            });
        }

        console.log(`Searching reservations from ${start} to ${end}`);

        const reservations = await Reservation.find({
            $or: [
                { startTime: { $lt: end, $gt: start } },
                { endTime: { $lt: end, $gt: start } },
                { startTime: { $lte: start }, endTime: { $gte: end } }
            ]
        }).populate({
            path: 'coworkingspace',
            select: 'name location tel'
        });

        res.status(200).json({ success: true, count: reservations.length, data: reservations });
    } catch (err) {
        console.log('Error in searchReservationsByTime:', err.stack);
        return res.status(500).json({ success: false, message: "Cannot search reservations" });
    }
};