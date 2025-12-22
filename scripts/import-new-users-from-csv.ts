// scripts/import-new-users-from-csv.ts
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import bcrypt from "bcryptjs";

type CsvRow = {
  _id?: string;
  email: string;
  hashedPassword?: string;
  name?: string;
  emailVerified?: string;
  createdAt?: string;
  updatedAt?: string;
  school?: string;
  role?: string;
};

const prisma = new PrismaClient();

async function main() {
  const csvFile = path.resolve(__dirname, "./schoolhub.users.csv"); // user 정보가 든 csv 파일을 이곳에 준비해줍니다.
  const content = fs.readFileSync(csvFile, "utf-8");
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const DEFAULT_PASSWORD = "abcd1234!@";
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const rawUsers = rows
    .filter((r) => r.email && !r.hashedPassword)
    .map((r) => ({
      email: r.email,
      hashedPassword: defaultHash,
      name: r.name || null,
      school: r.school || null,
      role: r.role || null,
    }));

  if (rawUsers.length === 0) {
    console.log("신규로 삽입할 사용자가 없습니다.");
    return;
  }

  // 1) 이미 존재하는 이메일 조회
  const emails = rawUsers.map((u) => u.email);
  const existing = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((e) => e.email));

  // 2) 중복 제외
  const toInsert = rawUsers.filter((u) => !existingSet.has(u.email));
  if (toInsert.length === 0) {
    console.log("모든 사용자가 이미 존재합니다. 삽입할 신규 사용자가 없습니다.");
    return;
  }

  // 3) 대량 삽입 (MongoDB: skipDuplicates 미지원 → 사전 필터링으로 대체)
  //    데이터가 많으면 배치로 나눠 실행
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    await prisma.user.createMany({ data: chunk });
  }

  console.log(`Inserted ${toInsert.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });