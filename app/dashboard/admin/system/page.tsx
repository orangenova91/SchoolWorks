import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Server, CalendarDays, Mail, MessageSquare } from "lucide-react";
import { SchoolLogoManager } from "@/components/dashboard/admin/SchoolLogoManager";

const systemHealth = [
  { label: "API 응답 시간", value: "312ms", trend: "+18%", status: "주의" },
  { label: "DB CPU", value: "42%", trend: "-5%", status: "안정" },
  { label: "파일 스토리지", value: "68%", trend: "+2%", status: "안정" },
];

const integrationStatus = [
  {
    name: "NEIS 연동",
    status: "정상",
    updatedAt: "00:15",
    detail: "출결/시간표 동기화 완료",
  },
  {
    name: "LMS (외부)",
    status: "지연",
    updatedAt: "현재",
    detail: "성적 API 응답 지연 (avg 2.3s)",
  },
  {
    name: "결제/후원 시스템",
    status: "대기",
    updatedAt: "어제",
    detail: "사용 안 함",
  },
];

const nextTasks = [
  {
    icon: CalendarDays,
    title: "정기 백업 검증",
    description: "11월 19일 02:00 · 자동 리포트 공유",
    accent: "text-blue-500",
  },
  {
    icon: Mail,
    title: "신규 관리자 온보딩",
    description: "웰컴 키트 & MFA 설정 안내",
    accent: "text-emerald-500",
  },
  {
    icon: MessageSquare,
    title: "교사 서포트 이슈 3건",
    description: "처리 SLA 4시간 남음",
    accent: "text-amber-500",
  },
];

export default async function AdminSystemPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      school: true,
      adminProfile: {
        select: {
          schoolId: true,
          school: { select: { name: true } },
        },
      },
    },
  });

  const normalizedSchoolName =
    currentUser?.adminProfile?.school?.name?.trim() ||
    currentUser?.school?.trim() ||
    null;

  const primarySchool = currentUser?.adminProfile?.schoolId
    ? await prisma.school.findUnique({
        where: { id: currentUser.adminProfile.schoolId },
        select: { id: true, name: true, logoUrl: true, updatedAt: true },
      })
    : null;

  const nameSchools = normalizedSchoolName
    ? await prisma.school.findMany({
        where: { name: normalizedSchoolName },
        select: { id: true, name: true, logoUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const adminSchools = !normalizedSchoolName
    ? await prisma.school.findMany({
        where: { adminUserId: session.user.id },
        select: { id: true, name: true, logoUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const schoolCandidates = [
    ...(primarySchool ? [primarySchool] : []),
    ...nameSchools,
    ...adminSchools,
  ];

  const schoolWithLogo = schoolCandidates.find((item) => item.logoUrl);
  const school = schoolWithLogo ?? schoolCandidates[0] ?? null;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-gray-500">Admin · System</p>
        <h1 className="text-3xl font-bold mt-1 text-gray-900">시스템 상태 & 통합</h1>
        <p className="text-gray-500 mt-2">
          인프라 지표, 외부 연동, 운영 작업을 모아서 점검합니다.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-600" />
            <p className="text-sm font-semibold text-gray-900">서비스 상태</p>
          </div>
          <ul className="mt-4 space-y-3">
            {systemHealth.map((item) => (
              <li key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.trend} (전일)</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    item.status === "주의"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">외부 연동</p>
          <div className="mt-4 space-y-4">
            {integrationStatus.map((integration) => (
              <div key={integration.name} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      integration.status === "정상"
                        ? "bg-emerald-50 text-emerald-700"
                        : integration.status === "지연"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {integration.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{integration.detail}</p>
                <p className="text-xs text-gray-400 mt-1">업데이트 {integration.updatedAt}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">다음 작업</p>
          <ul className="mt-4 space-y-3">
            {nextTasks.map((task) => {
              const Icon = task.icon;
              return (
                <li key={task.title} className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 ${task.accent}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="mt-6 w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600">
            작업 리스트 모두 보기
          </button>
        </div>
      </section>

      <SchoolLogoManager
        schoolName={school?.name ?? null}
        initialLogoUrl={school?.logoUrl ?? null}
      />
    </div>
  );
}

