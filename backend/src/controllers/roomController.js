const prisma = require('../prismaClient');

// ─── CREATE ROOM ──────────────────────────────────────────────
const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name required' });

    // Create room and auto-add creator as member
    const room = await prisma.room.create({
      data: {
        name,
        members: {
          create: { userId: req.userId }
        },
        files: {
          create: {
            name: 'main.js',
            content: '// Start coding here\nconsole.log("Hello, World!");',
            language: 'javascript'
          }
        }
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        files: true
      }
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET MY ROOMS ─────────────────────────────────────────────
const getMyRooms = async (req, res) => {
  try {
    const memberships = await prisma.roomMember.findMany({
      where: { userId: req.userId },
      include: {
        room: {
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
            files: true
          }
        }
      }
    });

    const rooms = memberships.map(m => m.room);
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET SINGLE ROOM ──────────────────────────────────────────
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check user is a member
    const membership = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId }
    });

    if (!membership)
      return res.status(403).json({ error: 'Not a member of this room' });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        files: true,
        messages: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── JOIN ROOM ────────────────────────────────────────────────
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const existing = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId }
    });

    if (existing) return res.json({ message: 'Already a member', room });

    await prisma.roomMember.create({
      data: { roomId, userId: req.userId }
    });

    res.json({ message: 'Joined room', room });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── CREATE FILE IN ROOM ──────────────────────────────────────
const createFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, language } = req.body;

    const membership = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId }
    });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const file = await prisma.file.create({
      data: { name, language: language || 'javascript', roomId }
    });

    res.status(201).json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET FILE VERSIONS ────────────────────────────────────────
const getFileVersions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { savedAt: 'desc' },
      take: 20
    });
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createRoom, getMyRooms, getRoom, joinRoom, createFile, getFileVersions };
