import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";

const AnnouncementPageClient = dynamic(
  () => import("../announcements/AnnouncementPageClient").then((mod) => mod.AnnouncementPageClient),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

export default async function TeacherTestBoardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const authorName = session.user.name || session.user.email || "담당 교사";

  return (
    <AnnouncementPageClient 
      title="TEST 게시판"
      description="테스트용 게시판입니다."
      authorName={authorName}
      includeScheduled={true}
      boardType="board_test"
    />
  );
}
