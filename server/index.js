require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const socketService = require('./services/socket.service');
const { startArchiveCron } = require('./services/archiveCron.service');

// Initialize Express application
const app = express();
connectDB();

// Middlewares
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Standard API Routes
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const integrationRoutes = require('./routes/api.routes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api', integrationRoutes); // Mounts the Chat and PDF endpoints

// Wrap Express with native Node HTTP Server for Socket.io
const server = http.createServer(app);

// ----- WEB SOCKET REAL-TIME CHAT INTEGRATION -----
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware to authenticate socket connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided'));
  
  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
    const decoded = jwt.verify(token, secret);
    socket.userId = decoded.id || decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Track active connections
socketService.setIo(io);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} on socket ${socket.id}`);
  socketService.addUserSocket(socket.userId, socket.id);

  // Join isolated negotiation room
  socket.on('join_room', (itemId) => {
    socket.join(itemId);
    console.log(`User ${socket.userId} joined room: ${itemId}`);
  });

  // Handle bi-directional real-time messaging
  socket.on('send_message', async (data) => {
    try {
      const { itemId, receiverId, text } = data;
      const senderId = socket.userId;

      // Persist the message to MongoDB
      const newMessage = new Message({ itemId, senderId, receiverId, text });
      const savedMessage = await newMessage.save();

      // Broadcast exclusively to users inside the negotiation room
      io.to(itemId).emit('receive_message', savedMessage);

      // Trigger a global notification to the receiver for the Navbar badge
      socketService.emitGlobalNotification(receiverId, savedMessage);
    } catch (error) {
      console.error('Socket DB persistence error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    socketService.removeUserSocket(socket.userId);
  });
});

app.get('/', (req, res) => res.send('SL-SLFMS API & Socket Server Active...'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server and WebSockets running synchronously on port ${PORT}`);
  // Start the Item Expiry & Auto Archive daily cron job
  startArchiveCron();
});
