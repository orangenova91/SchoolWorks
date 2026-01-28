const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  try {
    const anns = await prisma.announcement.findMany({
      where: { school: null },
      select: { id: true, authorId: true, title: true },
      take: 1000,
    });

    console.log(`Found ${anns.length} announcements with null school`);
    for (const a of anns) {
      const author = await prisma.user.findUnique({
        where: { id: a.authorId },
        select: { school: true },
      });
      const school = author?.school || null;
      if (!school) {
        console.log(`Skipping announcement ${a.id} ("${a.title}") — author has no school`);
        continue;
      }
      await prisma.announcement.update({
        where: { id: a.id },
        data: { school },
      });
      console.log(`Updated announcement ${a.id} -> school="${school}"`);
    }
    console.log("Done.");
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

