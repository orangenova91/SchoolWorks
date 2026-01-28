const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.announcement.findMany({
    where: { school: null },
    select: { id: true, title: true, boardType: true, audience: true, authorId: true, school: true },
    take: 50
  });
  console.log(rows);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });