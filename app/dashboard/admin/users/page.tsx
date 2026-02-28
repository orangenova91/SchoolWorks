import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { Users, UserPlus, Megaphone, Settings } from "lucide-react";
import { UsersTableWrapper } from "../../../../components/dashboard/admin/UsersTableWrapper";


const quickActions = [
  {
    label: "새 관리자 초대",
    description: "시스템 접근 권한을 가진 운영자를 추가합니다.",
    icon: UserPlus,
  },
  {
    label: "긴급 공지 발송",
    description: "SMS/푸시/메일로 일괄 안내합니다.",
    icon: Megaphone,
  },
  {
    label: "시스템 점검 예약",
    description: "Maintenance 모드를 안내하고 일정을 잡습니다.",
    icon: Settings,
  },
];

const pendingApprovals = [
  {
    id: "REQ-2025-1182",
    name: "이은지",
    role: "교사",
    school: "서울과학고",
    submittedAt: "11:04",
    status: "학교 인증 대기",
  },
  {
    id: "REQ-2025-1180",
    name: "김태훈",
    role: "학부모",
    school: "중앙중학교",
    submittedAt: "09:32",
    status: "추가 서류 필요",
  },
  {
    id: "REQ-2025-1174",
    name: "박소연",
    role: "교사",
    school: "한빛초등학교",
    submittedAt: "어제",
    status: "승인 대기",
  },
];

const activityTimeline = [
  {
    time: "10:24",
    actor: "이수민 (관리자)",
    action: "교사 계정 12명 CSV 업로드",
  },
  {
    time: "09:10",
    actor: "김재훈 (슈퍼관리자)",
    action: "정책 > 2단계 인증 필수 적용",
  },
  {
    time: "어제",
    actor: "박민정 (관리자)",
    action: "겨울방학 안내 공지 예약 발행",
  },
];

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    redirect("/dashboard");
  }

  type StudentProfileSummary = {
    userId: string;
    grade: string | null;
    classLabel: string | null;
    section: string | null;
    studentId: string | null;
  };

  const prismaAny = prisma as any;

  // 관리자의 학교 정보 가져오기
  const adminSchool = session.user.school;

  // superadmin인 경우 모든 사용자, admin인 경우 같은 학교의 사용자만
  const userWhereCondition = session.user.role === "superadmin" 
    ? undefined 
    : adminSchool 
    ? { school: adminSchool }
    : { school: null }; // 학교 정보가 없는 경우 빈 결과

  // 먼저 사용자 목록 가져오기
  const users = await prisma.user.findMany({
    where: userWhereCondition,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      school: true,
      role: true,
      createdAt: true,
      // hashedPassword는 제외 (보안상 노출하지 않음)
    },
  });

  // 해당 사용자들의 studentProfile 가져오기
  const userIds = users.map((user) => user.id);
  const studentProfiles = userIds.length > 0
    ? ((await prismaAny.studentProfile.findMany({
        where: {
          userId: { in: userIds },
        },
        select: {
          userId: true,
          grade: true,
          classLabel: true,
          section: true,
          studentId: true,
        },
      })) as StudentProfileSummary[])
    : [];

  const studentProfileMap = new Map<string, StudentProfileSummary>(
    studentProfiles.map((profile) => [profile.userId, profile]),
  );

  type TeacherProfileSummary = { userId: string; roleLabel: string | null };
  const teacherProfiles = userIds.length > 0
    ? ((await prismaAny.teacherProfile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, roleLabel: true },
      })) as TeacherProfileSummary[])
    : [];
  const teacherProfileMap = new Map<string, TeacherProfileSummary>(
    teacherProfiles.map((profile) => [profile.userId, profile]),
  );

  const tableRows = users.map((user) => {
    const studentProfile = studentProfileMap.get(user.id);
    const teacherProfile = teacherProfileMap.get(user.id);
    return {
      id: user.id,
      name: user.name ?? "-",
      school: user.school ?? "-",
      role: user.role ?? "미지정",
      studentId: user.role === "student" ? studentProfile?.studentId ?? "-" : "-",
      roleLabel: user.role === "teacher" ? teacherProfile?.roleLabel ?? "-" : "-",
      grade: user.role === "student" ? studentProfile?.grade ?? "-" : "-",
      className: user.role === "student" ? studentProfile?.classLabel ?? "-" : "-",
      createdAt: user.createdAt.toISOString(),
      email: user.email,
    };
  });

  // 역할별 분포 계산 (슈퍼관리자 제외)
  const usersExcludingSuperadmin = users.filter((user) => user.role !== "superadmin");
  const totalUsers = usersExcludingSuperadmin.length;

  const roleCounts = usersExcludingSuperadmin.reduce((acc, user) => {
    const role = user.role || "미지정";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 학생 데이터를 학년/반별로 그룹화
  const studentUsers = usersExcludingSuperadmin.filter((user) => user.role === "student");
  const studentUserIds = studentUsers.map((user) => user.id);
  const studentProfilesForStats = studentProfiles.filter((profile) =>
    studentUserIds.includes(profile.userId)
  );

  // classLabel에서 반 번호만 추출하는 함수
  const getSectionNumber = (classLabel: string | null): string => {
    if (!classLabel || classLabel === "-") return "";
    // "1-1" 형태면 하이픈 뒤의 숫자, 아니면 그대로
    return classLabel.includes("-") ? classLabel.split("-")[1] : classLabel;
  };

  // 학년-반번호별 학생수 계산
  const gradeSectionStats = studentProfilesForStats.reduce((acc, profile) => {
    const grade = profile.grade && profile.grade !== "-" ? profile.grade : null;
    const sectionNumber = getSectionNumber(profile.classLabel);
    
    if (grade && sectionNumber) {
      const key = `${grade}-${sectionNumber}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 각 학년별 반 번호 목록 추출
  const getSectionNumbersByGrade = (grade: string) => {
    return Array.from(
      new Set(
        studentProfilesForStats
          .filter((p) => p.grade === grade && getSectionNumber(p.classLabel) !== "")
          .map((p) => getSectionNumber(p.classLabel))
      )
    ).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  };

  // 학년별 총 학생수 계산
  const getGradeTotalCount = (grade: string) => {
    return studentProfilesForStats.filter((p) => p.grade === grade).length;
  };

  // 학년별-반번호별 학생수 조회
  const getGradeSectionCount = (grade: string, sectionNumber: string) => {
    return gradeSectionStats[`${grade}-${sectionNumber}`] || 0;
  };

  // 모든 반 번호 목록 추출 (헤더용)
  const allSectionNumbers = Array.from(
    new Set(
      studentProfilesForStats
        .map((p) => getSectionNumber(p.classLabel))
        .filter((s) => s !== "")
    )
  ).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  // 학년 목록 (1, 2, 3학년)
  const grades = ["1", "2", "3"].filter((grade) =>
    studentProfilesForStats.some((p) => p.grade === grade)
  );

  const roleLabels: Record<string, { label: string; accent: string; progressColor: string }> = {
    student: { label: "학생", accent: "bg-green-100 text-green-700", progressColor: "bg-green-500" },
    teacher: { label: "교사", accent: "bg-pink-100 text-pink-700", progressColor: "bg-pink-500" },
    admin: { label: "관리자", accent: "bg-purple-100 text-purple-700", progressColor: "bg-purple-500" },
    parent: { label: "학부모", accent: "bg-blue-100 text-blue-700", progressColor: "bg-blue-500" },
  };

  // 숫자 포맷팅 함수 (서버 사이드 안전)
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const userDistribution = Object.entries(roleLabels)
    .map(([role, { label, accent, progressColor }]) => {
      const count = roleCounts[role] || 0;
      const ratio = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
      return {
        label,
        count: formatNumber(count),
        ratio,
        accent,
        progressColor,
      };
    })
    .filter((item) => {
      const countNum = parseInt(item.count.replace(/,/g, ""));
      return countNum > 0;
    }) // 0인 항목 제외
    .sort((a, b) => b.ratio - a.ratio); // 비율 내림차순 정렬

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-gray-500">Admin · Users</p>
        <h1 className="text-3xl font-bold mt-1 text-gray-900">사용자 & 권한 관리</h1>
        <p className="text-gray-500 mt-2">
          역할 분포, 계정 승인, 빠른 운영 작업을 중앙에서 처리합니다.
        </p>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-10">
          {/* 왼쪽: 전체 사용자 수 */}
          <div className="flex-shrink-0">
            <p className="text-sm font-semibold text-gray-800 mb-2">전체 사용자</p>
            <p className="text-4xl font-bold text-gray-900">{formatNumber(totalUsers)}</p>
          </div>

          {/* 오른쪽: 역할별 분포 및 학생 학년/반별 통계 */}
          <div className="flex-1">
            <div className="flex items-start gap-10">
              {/* 역할별 분포 */}
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800 mb-4">역할별 분포</p>
                <div className="flex items-end gap-4 h-36">
                  {userDistribution.map((segment) => (
                    <div key={segment.label} className="flex-1 flex flex-col items-center gap-2 h-full min-w-0">
                      {/* 세로 프로그레스 바 */}
                      <div className="relative w-full h-full bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${segment.progressColor}`}
                          style={{ height: `${segment.ratio}%` }}
                        ></div>
                      </div>
                      {/* 레이블 및 정보 */}
                      <div className="flex flex-col items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${segment.progressColor}`}></span>
                        <p className="text-xs font-medium text-gray-800">{segment.label}</p>
                        <p className="text-xs font-semibold text-gray-900">{segment.count}명</p>
                        <p className={`text-xs font-semibold px-1.5 py-0.5 rounded ${segment.accent}`}>
                          {segment.ratio}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 학생 학년/반별 통계 (학생이 있는 경우만 표시) */}
              {roleCounts.student > 0 && grades.length > 0 && (
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 mb-4">학생 학년/반별 분포</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate" style={{ borderSpacing: "0 0.5rem" }}>
                      <thead>
                        <tr>
                          <th className="text-xs px-2 py-1 text-center text-gray-500 font-semibold uppercase tracking-wider"></th>
                          <th className="text-xs px-2 py-1 text-center text-gray-500 font-semibold uppercase tracking-wider">
                            총 학생수
                          </th>
                          {allSectionNumbers.map((sectionNum) => (
                            <th
                              key={sectionNum}
                              className="text-xs px-2 py-1 text-center text-gray-500 font-semibold uppercase tracking-wider"
                            >
                              {sectionNum}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((grade) => {
                          const gradeSectionNumbers = getSectionNumbersByGrade(grade);
                          const gradeTotal = getGradeTotalCount(grade);
                          return (
                            <tr key={grade}>
                              <td className="text-sm font-medium text-gray-900 px-2 py-1">
                                {grade}학년
                              </td>
                              <td className="text-sm text-center text-gray-700 px-2 py-1">
                                {formatNumber(gradeTotal)}명
                              </td>
                              {allSectionNumbers.map((sectionNum) => {
                                const count = getGradeSectionCount(grade, sectionNum);
                                return (
                                  <td
                                    key={sectionNum}
                                    className="text-sm text-center text-gray-700 px-2 py-1"
                                  >
                                    {count > 0 ? count : "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <UsersTableWrapper rows={tableRows} initialPageSize={20} adminSchool={adminSchool || undefined} />
      </section>
      
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">승인 대기</p>
            <span className="text-xs text-gray-500">오늘 7건</span>
          </div>
          <div className="mt-4 divide-y divide-gray-100">
            {pendingApprovals.map((request) => (
              <div key={request.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{request.name}</p>
                  <p className="text-xs text-gray-500">
                    {request.role} · {request.school}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{request.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{request.submittedAt}</p>
                  <div className="mt-2 space-x-2">
                    <button className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600">
                      반려
                    </button>
                    <button className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500">
                      승인
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-800">최근 관리자 활동</p>
          <ul className="mt-4 space-y-4">
            {activityTimeline.map((item) => (
              <li key={item.actor} className="flex items-start gap-3">
                <div className="rounded-full bg-slate-100 text-slate-600 p-2">
                  <ClockIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.actor}</p>
                  <p className="text-xs text-gray-500">{item.action}</p>
                </div>
                <span className="text-xs text-gray-400 ml-auto">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-gray-800">빠른 작업</p>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="w-full text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-full bg-blue-50 text-blue-600">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

