import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StaffListTable from "@/components/dashboard/teacher/StaffListTable";
import { RosterToggle } from "@/components/dashboard/teacher/RosterToggle";

export const dynamic = 'force-dynamic';

export default async function TeacherStaffPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const teacherSchool = session.user.school;

  // 같은 학교의 교직원들만 조회 (teacher, admin 역할)
  const staff = await prisma.user.findMany({
    where: {
      role: {
        in: ["teacher", "admin"],
      },
      school: teacherSchool || undefined,
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      role: true,
      createdAt: true,
    },
  });

  // TeacherProfile 정보 가져오기
  const staffIds = staff.map((member) => member.id);
  const prismaAny = prisma as any;
  const teacherProfiles = staffIds.length > 0
    ? await prismaAny.teacherProfile.findMany({
        where: {
          userId: { in: staffIds },
        },
        select: {
          userId: true,
          roleLabel: true,
          major: true,
          classLabel: true,
          grade: true,
          section: true,
          phoneNumber: true,
        },
      })
    : [];

  type TeacherProfileSummary = {
    userId: string;
    roleLabel: string | null;
    major: string | null;
    classLabel: string | null;
    grade: string | null;
    section: string | null;
    phoneNumber: string | null;
  };

  const profileMap = new Map<string, TeacherProfileSummary>(
    teacherProfiles.map((profile: TeacherProfileSummary) => [
      profile.userId,
      profile,
    ])
  );

  const staffWithProfiles = staff.map((member) => {
    const profile = profileMap.get(member.id);
    return {
      id: member.id,
      name: member.name ?? "-",
      email: member.email,
      school: member.school ?? "-",
      role: member.role ?? "-",
      roleLabel: profile?.roleLabel ?? "-",
      major: profile?.major ?? "-",
      classLabel: profile?.classLabel ?? "-",
      grade: profile?.grade ?? "-",
      section: profile?.section ?? "-",
      phoneNumber: profile?.phoneNumber ?? "-",
      createdAt: member.createdAt,
    };
  });

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <RosterToggle currentPage="staff" />
        <h1 className="text-2xl font-bold text-gray-900">교직원 명렬</h1>
        <p className="mt-2 text-sm text-gray-600">
          학교 교직원 목록을 확인할 수 있습니다.
        </p>
      </header>

      <StaffListTable staff={staffWithProfiles} />
    </div>
  );
}


