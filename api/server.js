// const express = require('express');
// const dotenv = require('dotenv');
// const cookieParser = require('cookie-parser');
// const connectDB = require('../config/db');

// //Security packages
// const mongoSanitize = require('express-mongo-sanitize');
// const helmet = require('helmet');
// const {xss} = require('express-xss-sanitizer');
// const rateLimit = require('express-rate-limit');
// const hpp = require('hpp');
// const cors = require('cors');


// //load env vars
// dotenv.config({ path: './config/config.env' });

// //Connect to database
// connectDB();

// //Route files
// const coworkingspaces = require('../routes/coworkingspaces');
// const auth = require('../routes/auth');
// const reservations = require('../routes/reservations');

// const app = express();

// //body parser
// app.use(express.json());

// app.use('/api/v1/coworkingspaces', coworkingspaces);
// app.use('/api/v1/auth', auth);
// app.use('/api/v1/reservations', reservations);

// //cookie parser
// app.use(cookieParser());

// //Sanitize data
// app.use(mongoSanitize());

// //Set security headers
// app.use(helmet());

// //Prevent XSS attacks
// app.use(xss());

// //Rate limiting
// const limiter = rateLimit({
//     windowMs: 10 * 60 * 1000, //10mins
//     max: 100
// });
// app.use(limiter);

// //Prevent http param pollution
// app.use(hpp());

// //Enable CORS
// app.use(cors());

// const PORT = process.env.PORT || 5000;

// const server = app.listen(PORT,console.log('Server running in' ,process.env.NODE_ENV, 'mode on port' , PORT));

// //Handle unhandled promise rejections
// process.on('unhandledRejection', (err, promise) => {
//     console.log(`Error: ${err.message}`);
//     //Close server & exit process
//     server.close(() => process.exit(1));
// });

const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Security packages
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');

// Load env vars
// dotenv.config({ path: './config/config.env' });
dotenv.config();


// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Route files
const coworkingspaces = require('./routes/coworkingspaces');
const auth = require('./routes/auth');
const reservations = require('./routes/reservations');

// Mount routers
app.use('/api/v1/coworkingspaces', coworkingspaces);
app.use('/api/v1/auth', auth);
app.use('/api/v1/reservations', reservations);
app.use('/api/v1/coworkingspace/:coworkingspaceId/reservations', reservations);





module.exports = app;
