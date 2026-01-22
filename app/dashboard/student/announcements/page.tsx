import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";

const AnnouncementList = dynamic(
  () => import("@/components/dashboard/AnnouncementList").then((mod) => mod.AnnouncementList),
  { ssr: false }
);

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  return (
    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">학생 게시판</h1>
        <p className="mt-2 text-sm text-gray-600">
          학생 대상 공지사항을 확인하세요.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <AnnouncementList includeScheduled={false} audience="students" boardType="board_students" />
      </section>
    </div>
  );
}
