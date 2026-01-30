import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import CourseTabs from "@/components/dashboard/CourseTabs";
import dynamic from "next/dynamic";

const AnnouncementPageClient = dynamic(
  () => import("../announcements/AnnouncementPageClient").then((mod) => mod.AnnouncementPageClient),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

export default async function AfterSchoolPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  const t = getTranslations("ko");

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">방과후 수업</h1>
        </div>
        <p className="text-sm text-gray-600 mt-1">방과후 수업 관리를 위한 페이지입니다.</p>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "announcements", label: "공지사항" },
            { id: "student-enroll", label: "강의 신청(학생)" },
            { id: "teacher-create", label: "강의 생성(교사)" },
            { id: "course-apply", label: "수강 신청(학생)" },
            { id: "classroom", label: "강의실" },
          ]}
        >
          {[
            <article key="announcements" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <AnnouncementPageClient
                title="방과후 공지사항"
                description="방과후 수업 관련 공지사항을 작성하고 확인하세요."
                authorName={session.user.name || session.user.email || "담당 교사"}
                includeScheduled={true}
                audience="students"
                boardType="board_after_school"
                showGradeTabs
              />
            </article>,

            <article key="student-enroll" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">강의 신청(학생)</h2>
              <p className="text-sm text-gray-600 mt-2">아직 내용이 없습니다.</p>
            </article>,

            <article key="teacher-create" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">강의 생성(교사)</h2>
              <p className="text-sm text-gray-600 mt-2">아직 내용이 없습니다.</p>
            </article>,

            <article key="course-apply" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">수강 신청(학생)</h2>
              <p className="text-sm text-gray-600 mt-2">아직 내용이 없습니다.</p>
            </article>,

            <article key="classroom" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">강의실</h2>
              <p className="text-sm text-gray-600 mt-2">아직 내용이 없습니다.</p>
            </article>,
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}


