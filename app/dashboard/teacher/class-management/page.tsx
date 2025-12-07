import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n";
import CourseTabs from "@/components/dashboard/CourseTabs";

export default async function ClassManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const t = getTranslations("ko");

  // 교사 프로필에서 담임반 정보 가져오기
  const teacherProfile = await (prisma as any).teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      grade: true,
      classLabel: true,
      section: true,
      school: true,
    },
  });

  // 담임반 학생 목록 가져오기 (같은 학년, 반을 가진 학생들)
  const homeroomStudents =
    teacherProfile?.grade && teacherProfile?.classLabel
      ? await (prisma as any).user.findMany({
          where: {
            role: "student",
            studentProfile: {
              grade: teacherProfile.grade,
              classLabel: teacherProfile.classLabel,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                studentId: true,
                seatNumber: true,
                classOfficer: true,
              },
            },
          },
          orderBy: [
            { studentProfile: { seatNumber: "asc" } },
            { name: "asc" },
          ],
        })
      : [];

  // 담임반 정보 칩 생성
  const infoChips = [
    teacherProfile?.grade?.trim() ? `${teacherProfile.grade.trim()}학년` : null,
    teacherProfile?.classLabel?.trim()
      ? `${teacherProfile.classLabel.trim()}반`
      : null,
    teacherProfile?.section?.trim() ? teacherProfile.section.trim() : null,
  ].filter(Boolean) as string[];

  const homeroomTitle = teacherProfile?.grade && teacherProfile?.classLabel
    ? `${teacherProfile.grade}학년 ${teacherProfile.classLabel}반`
    : "담임반 관리";

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              href="/dashboard/teacher"
              className="hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1"
            >
              선생님 대시보드
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 font-medium truncate">
            {t.sidebar.teacher.classManagement}
          </li>
        </ol>
      </nav>

      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {infoChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {infoChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{homeroomTitle}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {teacherProfile?.school || "학교 정보 없음"}
            </p>
            {homeroomStudents.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">
                  학생 ({homeroomStudents.length}명)
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "dashboard", label: "대시보드" },
            { id: "students", label: "학생 관리" },
            { id: "attendance", label: "출결 관리" },
            { id: "announcements", label: "공지사항" },
            { id: "counseling", label: "상담기록" },
            { id: "statistics", label: "통계" },
          ]}
        >
          {[
            <article
              key="dashboard"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">대시보드</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>대시보드 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="students"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">학생 관리</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>학생 관리 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="attendance"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">출결 관리</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>출결 관리 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>공지사항 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="counseling"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">상담기록</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>상담기록 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
            <article
              key="statistics"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">통계</h2>
              </header>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>통계 내용이 여기에 표시됩니다.</p>
                </div>
              </div>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

