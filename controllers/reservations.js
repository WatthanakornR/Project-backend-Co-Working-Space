const Reservation = require('../models/Reservation');
const CoWorkingSpace = require('../models/CoWorkingSpace');

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


        req.body.user = req.user.id;

        const existedReservation = await Reservation.find({ user: req.user.id });
        if (existedReservation.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `User with ID ${req.user.id} has already made 3 reservations`
            });
        }

        const reservation = await Reservation.create(req.body);
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

        // Update reservation
        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

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
        
        res.status(200).json({ success: true, data: {} });
    }
    catch(err){
        console.log(err.stack);
        return res.status(500).json({ success: false, message:"Cannot delete Reservation" });
    }

}
