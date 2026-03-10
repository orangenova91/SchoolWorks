import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { authOptions } from "@/lib/auth";

const AttendancePrintClient = dynamic(
  () => import("./AttendancePrintClient").then((mod) => mod.AttendancePrintClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">출석부 인쇄 페이지를 불러오는 중입니다...</p>
        </div>
      </div>
    ),
  }
);

export default async function AttendancePrintPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  return (
    <AttendancePrintClient
      searchParams={searchParams}
      teacherName={session.user.name || session.user.email || "담당 교사"}
    />
  );
}

