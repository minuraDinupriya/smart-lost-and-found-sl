if (process.env.DEMO_MODE !== 'true') require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const { getJwtSecret, getAllowedOrigins, isAllowedOrigin } = require('./config/security');
const { registerChatHandlers } = require('./services/chat.service');
getJwtSecret();
const { authenticateSocket } = require('./middleware/socket.middleware');
const socketService = require('./services/socket.service');
const { startArchiveCron } = require('./services/archiveCron.service');

// Initialize Express application
const app = express();


// Middlewares
const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin, allowedOrigins)) {
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
const tipRoutes = require('./routes/tip.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const historyRoutes = require('./routes/history.routes');
const handoverRoutes = require('./routes/handover.routes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api', integrationRoutes); // Mounts the Chat and PDF endpoints

// Wrap Express with native Node HTTP Server for Socket.io
const server = http.createServer(app);

// ----- WEB SOCKET REAL-TIME CHAT INTEGRATION -----
const io = new Server(server, {
  allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin, allowedOrigins)),
  cors: {
    origin: function (origin, callback) {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.use(authenticateSocket);

// Track active connections
socketService.setIo(io);

io.on('connection', (socket) => {
  socketService.addUserSocket(socket.userId, socket.id);

  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    socketService.removeUserSocket(socket.userId);
  });
});

app.get('/', (req, res) => res.send('SL-SLFMS API & Socket Server Active...'));

const PORT = process.env.PORT || 5001;
connectDB().then(() => server.listen(PORT, () => {
  console.log(`Server and WebSockets running synchronously on port ${PORT}`);
  // Start the Item Expiry & Auto Archive daily cron job
  startArchiveCron();
})).catch(() => {
  console.error('Server startup failed.');
  process.exitCode = 1;
});
