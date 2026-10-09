import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ENV } from '../config/env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join user specific room for submission verdict notifications
    socket.on('subscribe_user', (userId: string) => {
      if (userId) socket.join(`user:${userId}`);
    });

    // Join contest room for live scoreboard
    socket.on('join_contest', (contestId: string) => {
      if (contestId) socket.join(`contest:${contestId}`);
    });

    socket.on('leave_contest', (contestId: string) => {
      if (contestId) socket.leave(`contest:${contestId}`);
    });

    // Join global leaderboard room
    socket.on('join_leaderboard', () => {
      socket.join('leaderboard');
    });

    socket.on('leave_leaderboard', () => {
      socket.leave('leaderboard');
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitSubmissionVerdict(userId: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit('submission_verdict', data);
  }
}

export function emitContestScoreboardUpdate(contestId: string, scoreboard: any) {
  if (io) {
    io.to(`contest:${contestId}`).emit('contest_scoreboard_update', scoreboard);
  }
}

export function emitLeaderboardUpdate(leaderboard: any) {
  if (io) {
    io.to('leaderboard').emit('leaderboard_update', leaderboard);
  }
}
