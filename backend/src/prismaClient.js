const { PrismaClient } = require('@prisma/client');

// We create ONE instance and reuse it everywhere
// Creating multiple instances wastes database connections
const prisma = new PrismaClient();

module.exports = prisma;
