import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FileText, Megaphone, Settings } from "lucide-react";
import dynamic from "next/dynamic";

const BannerSection = dynamic(() => import("@/components/dashboard/teacher/BannerSection"), { ssr: false });

const contentPipeline = [
  {
    title: "2학기 기말 운영 가이드",
    owner: "학사운영팀",
    channel: "공지센터",
    schedule: "11월 20일 08:00",
    status: "검수 중",
  },
  {
    title: "겨울방학 비교과 프로그램",
    owner: "진로진학팀",
    channel: "대시보드 배너",
    schedule: "11월 25일 09:30",
    status: "예약 발행",
  },
  {
    title: "교직원 연수 설문",
    owner: "교무실",
    channel: "메시지 센터",
    schedule: "11월 18일 14:00",
    status: "작성 중",
  },
];

export default async function AdminContentPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-gray-500">Admin · Content</p>
        <h1 className="text-3xl font-bold mt-1 text-gray-900">콘텐츠 · 공지 파이프라인</h1>
        <p className="text-gray-500 mt-2">예약 발행, 템플릿, 도달률을 한 화면에서 조정합니다.</p>
      </header>

      <BannerSection />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <p className="text-sm font-semibold text-gray-900">예약 콘텐츠</p>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-500">
              새 공지 작성
            </button>
          </div>
          <div className="mt-4 divide-y divide-gray-100">
            {contentPipeline.map((content) => (
              <article key={content.title} className="py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{content.title}</h3>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-3 py-1">
                    {content.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {content.owner} · {content.channel}
                </p>
                <p className="text-xs text-gray-400 mt-1">{content.schedule}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-semibold text-gray-800">공지 도달 현황</p>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
            <p className="text-sm text-orange-800 font-semibold">전체 열람률 92%</p>
            <p className="text-xs text-orange-700 mt-1">열람 미확인 대상 18건</p>
            <button className="mt-4 text-xs font-semibold text-orange-900 underline">
              리마인드 발송
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm font-semibold text-gray-800">템플릿 관리</p>
            <p className="text-xs text-gray-500 mt-1">공지, 설문, 배너 템플릿 12개</p>
            <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              <Settings className="w-3 h-3" />
              템플릿 수정
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

