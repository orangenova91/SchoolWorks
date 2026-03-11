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

const EvaluationPlanSection = dynamic(
  () => import("@/components/dashboard/EvaluationPlanSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

const TeachingProgressSection = dynamic(
  () => import("@/components/dashboard/TeachingProgressSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

export default async function EvaluationPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">평가</h1>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          평가 공지, 평가계획서, 정기고사 관리를 위한 페이지입니다.
        </p>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "announcements", label: "공지사항" },
            { id: "teaching-progress", label: "교수학습진도표" },
            { id: "evaluation-plan", label: "평가계획서" },
            { id: "regular-exams", label: "정기고사" },
          ]}
        >
          {[
            <article
              key="announcements"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <AnnouncementPageClient
                title="평가 공지사항"
                description="평가 관련 공지사항을 작성하고 확인하세요."
                authorName={
                  session.user.name || session.user.email || "담당 교사"
                }
                includeScheduled={true}
                audience="teacher"
                boardType="board_evaluation"
              />
            </article>,

            <article key="teaching-progress" className="min-w-0">
              <TeachingProgressSection />
            </article>,

            <article key="evaluation-plan" className="min-w-0">
              <EvaluationPlanSection />
            </article>,

            <article
              key="regular-exams"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900">정기고사</h2>
              <p className="text-sm text-gray-600 mt-2">
                정기고사 일정 및 관리 내용이 여기에 표시됩니다.
              </p>
              <div className="text-center py-12">
                <p className="text-gray-500">서비스 준비중입니다.</p>
              </div>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}
