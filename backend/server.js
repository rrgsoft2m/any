
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());

const path = require('path');
const server = http.createServer(app);

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Anything that doesn't match the above, send back index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const io = new Server(server, {
  cors: {
    origin: "*", // allow from any origin during dev
    methods: ["GET", "POST"]
  }
});

// Store active sessions (ID -> { hostSocketId, clientSocketId })
const sessions = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates a session
  socket.on('create-session', (id) => {
    if (sessions[id]) {
      // Allow reconnect if same socket
      if (sessions[id].hostSocketId === socket.id) return;
      // Or error if taken? For now simply overwrite or fail
      // socket.emit('error', 'Session ID already exists');
      // return;
    }
    sessions[id] = { hostSocketId: socket.id, clientSocketId: null };
    socket.join(id);
    console.log(`Session created: ${id} by Host ${socket.id}`);
    socket.emit('session-created', id);
  });

  // Client joins a session
  socket.on('join-session', (id) => {
    const session = sessions[id];
    if (session) {
      if (session.clientSocketId) {
        socket.emit('error', 'Session is specific to one client only');
        return;
      }
      sessions[id].clientSocketId = socket.id;
      socket.join(id);
      console.log(`Client ${socket.id} joined session ${id}`);

      // Notify host that client is ready
      io.to(session.hostSocketId).emit('client-ready', socket.id);
      socket.emit('session-joined', id);
    } else {
      socket.emit('error', 'Invalid Session ID');
    }
  });

  // Relay WebRTC Signaling
  socket.on('offer', ({ target, payload }) => {
    io.to(target).emit('offer', { sender: socket.id, payload });
  });

  socket.on('answer', ({ target, payload }) => {
    io.to(target).emit('answer', { sender: socket.id, payload });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
  });

  // Handle Input Events (Data Channel should be preferred, but fallback via socket is okay for low-freq)
  // We'll primarily use DataChannel for input to ensure low latency and ordering

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup sessions
    for (const [id, session] of Object.entries(sessions)) {
      if (session.hostSocketId === socket.id) {
        // Host left -> end session
        io.to(id).emit('session-ended', 'Host disconnected');
        delete sessions[id];
      } else if (session.clientSocketId === socket.id) {
        // Client left -> notify host
        io.to(session.hostSocketId).emit('client-disconnected');
        session.clientSocketId = null;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
