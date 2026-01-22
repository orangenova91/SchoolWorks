import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";

const AnnouncementPageClient = dynamic(
  () => import("../announcements/AnnouncementPageClient").then((mod) => mod.AnnouncementPageClient),
  { ssr: false, loading: () => <div className="rounded-2xl border border-gray-200 bg-white p-6">로딩 중...</div> }
);

export default async function TeacherTest3NoticePage() {
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
      title="가정 안내문"
      description="가정 안내문을 작성하고 확인하세요."
      authorName={authorName}
      includeScheduled={true}
      boardType="board_parents"
      audience="parents"
    />
  );
}
