require('dotenv').config();
const express = require('express');
const cors = require('cors');

const morgan = require('morgan');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usersRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const subcategoryRoutes = require('./routes/subcategoryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const addressRoutes = require('./routes/addressRoutes');
const couponRoutes = require('./routes/couponRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



// Session configuration - UPDATED
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-secret-key',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: false, // Set to false for development
//     maxAge: 5 * 60 * 1000, // 5 minutes
//     httpOnly: true,
//     sameSite: 'lax'
//   }
// }));

// Debugging middleware for session
// app.use((req, res, next) => {
//   console.log('Session ID:', req.sessionID);
//   console.log('Session Data:', req.session);
//   next();
// });

app.use(express.json());
app.use(morgan('dev'));



// Rate limiting
// app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/coupons', couponRoutes);

app.use('/api/', uploadRoutes);


// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   server.close(() => {
//     console.log('HTTP server closed');
//     pool.end();
//   });
// });





// require('dotenv').config();
// const express = require('express');
// const session = require('express-session');
// const cors = require('cors');
// const morgan = require('morgan');
// const helmet = require('helmet');
// const { apiLimiter } = require('./middleware/rateLimiter');
// const errorHandler = require('./middleware/errorHandler');

// // Import routes
// const authRoutes = require('./routes/authRoutes');
// const productRoutes = require('./routes/productRoutes');
// const cartRoutes = require('./routes/cartRoutes');
// const orderRoutes = require('./routes/orderRoutes');
// const dashboardRoutes = require('./routes/dashboardRoutes');
// const usersRoutes = require('./routes/userRoutes');
// const vendorRoutes = require('./routes/vendorRoutes');
// const categoryRoutes = require('./routes/categoryRoutes');
// const subcategoryRoutes = require('./routes/subcategoryRoutes');
// const uploadRoutes = require('./routes/uploadRoutes');




// const app = express();

// // Security middleware
// app.use(helmet());
// app.use(cors());
// app.use(express.json());
// app.use(morgan('dev'));

// // Rate limiting
// app.use('/api/', apiLimiter);

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/cart', cartRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/vendor', vendorRoutes);
// app.use('/api/categories', categoryRoutes);
// app.use('/api/subcategories', subcategoryRoutes);
// app.use('/api/', uploadRoutes);


// // Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-secret-key',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 5 * 60 * 1000 // 5 minutes
//   }
// }));


// // Error handling
// app.use(errorHandler);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   server.close(() => {
//     console.log('HTTP server closed');
//     pool.end();
//   });
// });