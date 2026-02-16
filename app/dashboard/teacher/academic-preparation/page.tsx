import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import CourseTabs from "@/components/dashboard/CourseTabs";
import dynamic from "next/dynamic";

const CleaningAreaClient = dynamic(() => import("@/components/dashboard/CleaningArea"), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div>,
});

export default async function AcademicPreparationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">학사 준비</h1>
        </div>
        <p className="text-sm text-gray-600 mt-1">학사 준비를 위한 페이지입니다.</p>
      </header>

      <section>
        <CourseTabs
          tabs={[
            { id: "work-guide", label: "업무 안내" },
            { id: "cleaning-area", label: "청소구역" },
            { id: "volunteer", label: "봉사활동" },
            { id: "club", label: "동아리" },
            { id: "organization", label: "학급 및 학생회 조직" },
            { id: "awards", label: "수상(교내 시상 계획)" },
          ]}
        >
          {[
            <article key="work-guide" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">업무 안내</h2>
            <div className="text-center py-12">
              <p className="text-gray-500">내용이 준비 중입니다.</p>
            </div>
          </article>,
          
            <article key="cleaning-area" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <CleaningAreaClient />
            </article>,

            <article key="volunteer" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">봉사활동</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">내용이 준비 중입니다.</p>
              </div>
            </article>,

            <article key="club" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">동아리</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">내용이 준비 중입니다.</p>
              </div>
            </article>,

            <article key="organization" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">학급 및 학생회 조직</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">내용이 준비 중입니다.</p>
              </div>
            </article>,

            <article key="awards" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">수상(교내 시상 계획)</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">내용이 준비 중입니다.</p>
              </div>
            </article>,

            
          ]}
        </CourseTabs>
      </section>
    </div>
  );
}

