const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const distDir = path.join(__dirname, 'client', 'dist');
const distIndex = path.join(distDir, 'index.html');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.get('/', (req, res) => {
  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
    return;
  }

  res.status(200).send('Frontend nao compilado. Rode "npm run client:build" ou "npm run dev".');
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io')) {
    next();
    return;
  }

  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
    return;
  }

  next();
});

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function getRoomMembers(roomCode) {
  const room = rooms.get(roomCode);
  return room ? Array.from(room.members) : [];
}

function cleanupRoomIfEmpty(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.members.size === 0) {
    rooms.delete(roomCode);
  }
}

io.on('connection', (socket) => {
  socket.on('create-room', (ack) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      members: new Set([socket.id]),
    });
    socket.join(roomCode);

    if (typeof ack === 'function') {
      ack({ ok: true, roomCode, peerCount: 1 });
    }
  });

  socket.on('join-room', ({ roomCode }, ack) => {
    const room = rooms.get(roomCode);

    if (!room) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Sala nao encontrada.' });
      }
      return;
    }

    if (room.members.size >= 2) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Sala cheia (maximo 2 dispositivos).' });
      }
      return;
    }

    room.members.add(socket.id);
    socket.join(roomCode);

    const members = getRoomMembers(roomCode);
    members.forEach((memberId) => {
      if (memberId !== socket.id) {
        io.to(memberId).emit('peer-joined', {
          roomCode,
          peerId: socket.id,
        });
      }
    });

    if (typeof ack === 'function') {
      ack({ ok: true, roomCode, peerCount: room.members.size });
    }
  });

  socket.on('signal', ({ roomCode, target, signal }) => {
    if (!roomCode || !target || !signal) return;

    const room = rooms.get(roomCode);
    if (!room || !room.members.has(socket.id) || !room.members.has(target)) {
      return;
    }

    io.to(target).emit('signal', {
      from: socket.id,
      signal,
    });
  });

  socket.on('file-chunk', ({ roomCode, target, payload }) => {
    if (!roomCode || !target || !payload) return;

    const room = rooms.get(roomCode);
    if (!room || !room.members.has(socket.id) || !room.members.has(target)) {
      return;
    }

    io.to(target).emit('file-chunk', {
      from: socket.id,
      payload,
    });
  });

  socket.on('leave-room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.members.delete(socket.id);
    socket.leave(roomCode);
    socket.to(roomCode).emit('peer-left');
    cleanupRoomIfEmpty(roomCode);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomCode) => {
      if (room.members.has(socket.id)) {
        room.members.delete(socket.id);
        socket.to(roomCode).emit('peer-left');
        cleanupRoomIfEmpty(roomCode);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor ativo em http://localhost:${PORT}`);
});
