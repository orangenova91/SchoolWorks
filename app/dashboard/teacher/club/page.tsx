import { redirect } from "next/navigation";
import { getServerSession, authOptions } from "@/lib/auth";
import CourseTabs from "@/components/dashboard/CourseTabs";
import dynamic from "next/dynamic";

const AnnouncementPageClient = dynamic(
  () =>
    import("../announcements/AnnouncementPageClient").then(
      (mod) => mod.AnnouncementPageClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

const ClubBudgetPlanSection = dynamic(
  () => import("@/components/dashboard/ClubBudgetPlanSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

const ClubPlanSection = dynamic(
  () => import("@/components/dashboard/ClubPlanSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

const ClubOrganizationSection = dynamic(
  () => import("@/components/dashboard/ClubOrganizationSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

export default async function ClubPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">동아리</h1>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          동아리 공지, 조직, 계획서 및 운영 관리를 위한 페이지입니다.
        </p>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "announcements", label: "공지사항" },
            { id: "club-organization", label: "동아리 조직" },
            { id: "my-club-management", label: "내 동아리 관리" },
          ]}
        >
          {[
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <AnnouncementPageClient
                title="동아리 공지사항"
                description="동아리 운영 관련 공지사항을 작성하고 확인하세요."
                authorName={
                  session.user.name || session.user.email || "담당 교사"
                }
                includeScheduled={true}
                audience="teacher"
                boardType="board_club"
              />
            </article>,

            <article key="club-organization" className="min-w-0">
              <ClubOrganizationSection />
            </article>,

            <article
              key="my-club-management"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900">내 동아리 관리</h2>
              <p className="mt-2 text-sm text-gray-600">
                서비스 준비중입니다. 곧 제공될 예정입니다.
              </p>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}
