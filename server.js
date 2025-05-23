// Load environment variables before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const tixieaRoutes = require('./routes/tixieaRoutes');
const signupRoutes = require('./routes/signupRoutes');
const agentRoutes = require('./routes/agentRoutes');

// Initialize the Firebase (both client and admin)
try {
  const firebase = require('./config/firebase');
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // If Firebase fails to initialize, exit the process
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Updated CORS configuration to handle multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://go-agents.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined/null values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Regular body parser for all routes
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('GoAgent API Server');
});

// Routes
app.use('/api/tixiea', tixieaRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/agent', agentRoutes);

// Firebase Client SDK Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err.code || err.message);
  
  // Handle Firebase Client SDK errors
  if (err.code === 'auth/invalid-credential' || 
      err.code === 'auth/invalid-api-key' ||
      err.code === 'auth/network-request-failed' ||
      err.code === 'auth/email-already-in-use' ||
      err.code === 'auth/operation-not-allowed' ||
      err.code === 'auth/weak-password' ||
      err.code === 'auth/invalid-email' ||
      err.name === 'FirebaseError') {
    
    console.log('Firebase client error detected:', err.code);
    
    // Special handling for certain errors
    if (err.code === 'auth/email-already-in-use') {
      return res.status(409).json({
        error: 'User already exists',
        message: 'The email address is already in use by another account',
        code: err.code
      });
    }
    
    return res.status(401).json({
      error: 'Authentication failed',
      message: err.message || 'Firebase authentication error',
      details: err.message,
      code: err.code
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log('Allowed CORS origins:', allowedOrigins);
});