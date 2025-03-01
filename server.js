const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

//load env vars
dotenv.config({ path: './config/config.env' });

//Connect to database
connectDB();

//Route files
const coworkingspaces = require('./routes/coworkingspaces');
const auth = require('./routes/auth');
const reservations = require('./routes/reservations');

const app = express();

//body parser
app.use(express.json());

app.use('/api/v1/coworkingspaces', coworkingspaces);
app.use('/api/v1/auth', auth);
app.use('/api/v1/reservations', reservations);

//cookie parser
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT,console.log('Server running in' ,process.env.NODE_ENV, 'mode on port' , PORT));

//Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    //Close server & exit process
    server.close(() => process.exit(1));
});