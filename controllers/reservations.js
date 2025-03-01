const Reservation = require('../models/Reservation');
const CoWorkingSpace = require('../models/CoWorkingSpace');
const Log = require('../models/Log');

// @desc    Get all reservations    
// @route   GET /api/v1/reservations
// @access  Private
exports.getReservations = async(req, res, next) => {
    let query;
    if(req.user.role !== 'admin'){
        query = Reservation.find({ user: req.query.id}).populate({
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
         const startTime = new Date(req.body.startTime);
         const endTime = new Date(req.body.endTime);
 
         // split the time from the date object
         const startTimeString = startTime.toISOString().split('T')[1].substring(0, 5);
         const endTimeString = endTime.toISOString().split('T')[1].substring(0, 5);
 
         // check if the reservation time is within the opening hours of the coworking space
         if (startTimeString < coworkingspace.openTime || endTimeString > coworkingspace.closeTime) {
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

// @desc    Update a reservation
// @route   PUT /api/v1/reservations/:id
// @access  Private
exports.updateReservation = async(req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        // Make sure user is reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this reservation` });
        }

        // convert string to Date object
        const startTime = new Date(req.body.startTime);
        const endTime = new Date(req.body.endTime);

        // split the time from the date object
        const startTimeString = startTime.toISOString().split('T')[1].substring(0, 5);
        const endTimeString = endTime.toISOString().split('T')[1].substring(0, 5);

        // check if the reservation time is within the opening hours of the coworking space
        if (startTimeString < coworkingspace.openTime || endTimeString > coworkingspace.closeTime) {
            return res.status(400).json({
                success: false,
                message: `Reservation time must be within the opening hours of the coworking space (${coworkingspace.openTime} - ${coworkingspace.closeTime})`
            });
        }

        // check if the reservation time is less than 1 hour before the start time
        const now = new Date();
        const oneHourBeforeStartTime = new Date(reservation.startTime.getTime() - 60 * 60 * 1000); // 1 ชั่วโมงก่อนเวลาที่จองไว้

        if (now > oneHourBeforeStartTime) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update reservation less than 1 hour before the start time'
            });
        }

        // Overlapping reservation
        const overlappingReservations = await Reservation.find({
            coworkingspace: req.body.coworkingspace || reservation.coworkingspace,
            room_number: req.body.room_number || reservation.room_number,
            _id: { $ne: req.params.id }, // ยกเว้นการจองปัจจุบัน
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

        // Update reservation
        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        // Create log
        await Log.create({
            user: req.user.id,
            reservation: reservation._id,
            action: 'update'
        });

        res.status(200).json({ success: true, data: reservation });
    } catch (err) {
        console.log(err.stack);
        return res.status(500).json({ success: false, message: "Cannot update Reservation" });
    }
}

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