const { query } = require('express');
const CoWorkingSpace = require('../models/CoWorkingSpace');
const Reservation = require('../models/Reservation');

// @desc    Get all coworkingspaces
// @route   GET /api/v1/coworkingspaces
// @access  Public
exports.getCoworkingSpaces = async(req, res, next) => {
    let query;

    //Copy req.query
    const reqQuery = { ...req.query };

    //Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    //Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);
    console.log(reqQuery);  

    //Create query string
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    query = CoWorkingSpace.find(JSON.parse(queryStr)).populate('reservations');

    //Select Fields
    if(req.query.select){
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    //Sort
    if(req.query.sort){
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    }
    else{
        query = query.sort('-createdAt');
    }

    //Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try{
        const total = await CoWorkingSpace.countDocuments();
        query = query.skip(startIndex).limit(limit);
        //Executing query
        const coworkingspaces = await query;

        //Pagination result
        const pagination = {};

        if(endIndex < total){
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if(startIndex > 0){
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({ success: true, count: coworkingspaces.length, pagination, data: coworkingspaces });
    }catch(err){
        console.log(err.stack);
        res.status(500).json({ success: false, error: 'Server Error'});
    }
};

// @desc    Get single coworkingspace
// @route   GET /api/v1/coworkingspaces/:id
// @access  Public
exports.getCoworkingSpace = async(req, res, next) => {
    try{
        const coworkingspace = await CoWorkingSpace.findById(req.params.id).populate('reservations');

        if(!coworkingspace){
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: coworkingspace });
    }catch(err){
        console.log(err.stack);
        res.status(500).json({ success: false, error: 'Server Error'});
    }
};

// @desc    Create a coworkingspace
// @route   POST /api/v1/coworkingspaces
// @access  Private

exports.createCoworkingSpace = async(req, res, next) => {
    const coworkingspace = await CoWorkingSpace.create(req.body);
    res.status(201).json({ success: true, data: coworkingspace });
};

// @desc    Update a coworkingspace
// @route   PUT /api/v1/coworkingspaces/:id
// @access  Private
exports.updateCoworkingSpace = async(req, res, next) => {
    try{
        const coworkingspace = await CoWorkingSpace.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if(!coworkingspace){
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: coworkingspace });
    }
    catch(err){
        console.log(err.stack);
        res.status(400).json({ success: false});
    }
};

// @desc    Delete a coworkingspace
// @route   DELETE /api/v1/coworkingspaces/:id
// @access  Private
exports.deleteCoworkingSpace = async(req, res, next) => {
    try{
        const coworkingspace = await CoWorkingSpace.findById(req.params.id);

        if(!coworkingspace){
            return res.status(404).json({ success: false, message:`Co-working Space not found with id of ${req.params.id}` });
        }
        await Reservation.deleteMany({ coworkingspace: req.params.id });
        await CoWorkingSpace.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    }
    catch(err){
        console.log(err.stack);
        res.status(400).json({ success: false});
    }
};