require('dotenv').config();
const express = require('express');
const cors = require('cors');
const tixieaRoutes = require('./routes/tixieaRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const signupRoutes = require('./routes/signupRoutes');
const agentRoutes = require('./routes/agentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Updated CORS configuration to handle multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://go-agents-mm8oa16fd-ahmed-gacems-projects.vercel.app',
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

// Special handling for Stripe webhook route
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Regular body parser for other routes
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('GoAgent API Server');
});

// Routes
app.use('/api/tixiea', tixieaRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/agent', agentRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log('Allowed CORS origins:', allowedOrigins);
});