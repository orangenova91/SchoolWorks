import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SchoolRecord = {
  id: string;
  name: string;
  logoUrl: string | null;
  adminUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeName = (name: string) => name.trim();

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(`🔎 중복 학교 레코드 정리 시작 (apply=${apply})`);

  const schools = (await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      logoUrl: true,
      adminUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as SchoolRecord[];

  const groups = new Map<string, SchoolRecord[]>();
  for (const school of schools) {
    const key = normalizeName(school.name);
    const list = groups.get(key) ?? [];
    list.push(school);
    groups.set(key, list);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(
    ([, list]) => list.length > 1
  );

  if (!duplicateGroups.length) {
    console.log("✅ 중복 학교 레코드가 없습니다.");
    return;
  }

  let totalMerged = 0;
  let totalAdminProfilesUpdated = 0;
  let totalSchoolsDeleted = 0;

  for (const [name, list] of duplicateGroups) {
    const sorted = [...list].sort((a, b) => {
      const aHasLogo = Boolean(a.logoUrl);
      const bHasLogo = Boolean(b.logoUrl);
      if (aHasLogo !== bHasLogo) {
        return aHasLogo ? -1 : 1;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1);

    console.log(
      `\n🏫 학교명 "${name}" 중복 ${list.length}개 → 기준: ${canonical.id}`
    );
    console.log(
      `   - 기준 로고: ${canonical.logoUrl ? "있음" : "없음"} (updatedAt=${canonical.updatedAt.toISOString()})`
    );
    duplicates.forEach((item, index) => {
      console.log(
        `   - 삭제 대상 ${index + 1}: ${item.id} (logo=${item.logoUrl ? "있음" : "없음"}, updatedAt=${item.updatedAt.toISOString()})`
      );
    });

    if (!apply) {
      totalMerged += duplicates.length;
      continue;
    }

    const duplicateIds = duplicates.map((item) => item.id);

    const adminProfileResult = await prisma.adminProfile.updateMany({
      where: { schoolId: { in: duplicateIds } },
      data: { schoolId: canonical.id },
    });

    const deleteResult = await prisma.school.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    totalMerged += duplicates.length;
    totalAdminProfilesUpdated += adminProfileResult.count;
    totalSchoolsDeleted += deleteResult.count;
  }

  console.log("\n✅ 정리 요약");
  console.log(`- 병합된 학교 레코드: ${totalMerged}개`);
  if (apply) {
    console.log(`- 수정된 AdminProfile: ${totalAdminProfilesUpdated}개`);
    console.log(`- 삭제된 학교 레코드: ${totalSchoolsDeleted}개`);
  } else {
    console.log("- 적용하지 않음 (dry-run)");
    console.log("  실제 실행: tsx scripts/cleanup-duplicate-schools.ts --apply");
  }
}

main()
  .catch((error) => {
    console.error("❌ 정리 작업 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
