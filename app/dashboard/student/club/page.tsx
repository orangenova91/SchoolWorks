import { redirect } from "next/navigation";
import { getServerSession, authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";

const StudentClubExpressionSection = dynamic(
  () => import("@/components/dashboard/student/StudentClubExpressionSection"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        로딩 중...
      </div>
    ),
  }
);

export default async function StudentClubPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">동아리</h1>
        <p className="mt-1 text-sm text-gray-600">
          동아리 활동 표현을 작성하고 저장할 수 있습니다.
        </p>
      </header>

      <StudentClubExpressionSection />
    </div>
  );
}
