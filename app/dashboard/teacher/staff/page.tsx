import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  const profileMap = new Map(
    teacherProfiles.map((profile: { userId: string; roleLabel: string | null; major: string | null; classLabel: string | null; grade: string | null; section: string | null; phoneNumber: string | null }) => [
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

  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case "teacher":
        return "교사";
      case "admin":
        return "관리자";
      default:
        return role ?? "-";
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <Link
          href="/dashboard/teacher"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          대시보드로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">교직원 명렬</h1>
        <p className="mt-2 text-sm text-gray-600">
          학교 교직원 목록을 확인할 수 있습니다.
        </p>
        <div className="mt-4 text-sm text-gray-500">
          총 {staffWithProfiles.length}명
        </div>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  직책
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  담당 과목/분야
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  담당 학년/학반
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  전화번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  학교
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staffWithProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    등록된 교직원이 없습니다.
                  </td>
                </tr>
              ) : (
                staffWithProfiles.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getRoleDisplay(member.role)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {member.roleLabel}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {member.major}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {member.grade !== "-" && member.classLabel !== "-"
                        ? `${member.grade}학년 ${member.classLabel}학반${member.section !== "-" ? ` ${member.section}` : ""}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.school}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

