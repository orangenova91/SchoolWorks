import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function StaffBoardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">교직원 게시판</h1>
        <p className="mt-2 text-sm text-gray-600">
          교직원 전용 게시판입니다.
        </p>
      </header>

      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <p className="text-gray-600 text-center">
          게시판 기능이 곧 추가될 예정입니다.
        </p>
      </div>
    </div>
  );
}

