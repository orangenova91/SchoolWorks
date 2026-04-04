import Link from "next/link";
import { ClipboardList, GraduationCap, Megaphone } from "lucide-react";

const items = [
  {
    href: "/dashboard/teacher/board_teachers",
    title: "교직원 게시판",
    description: "교직원 대상 공지",
    icon: ClipboardList,
    accent: {
      icon: "text-blue-600 group-hover:text-blue-700",
      hoverBg: "hover:bg-blue-50",
      border: "hover:border-blue-300",
      title: "group-hover:text-blue-900",
    },
  },
  {
    href: "/dashboard/teacher/board_students",
    title: "학생 게시판",
    description: "학생 대상 게시",
    icon: GraduationCap,
    accent: {
      icon: "text-green-600 group-hover:text-green-700",
      hoverBg: "hover:bg-green-50",
      border: "hover:border-green-300",
      title: "group-hover:text-green-900",
    },
  },
  {
    href: "/dashboard/teacher/board_parents",
    title: "가정 안내문",
    description: "가정 통신 · 안내",
    icon: Megaphone,
    accent: {
      icon: "text-amber-600 group-hover:text-amber-700",
      hoverBg: "hover:bg-amber-50",
      border: "hover:border-amber-300",
      title: "group-hover:text-amber-900",
    },
  },
] as const;

export default function TeacherBoardQuickLinks() {
  return (
    <section className="py-0"> {/* 배경과 테두리를 제거하고 상하 여백만 유지 */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        

        {/* 오른쪽: 내부 카드들만 강조하는 스타일 */}
        <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(({ href, title, description, icon: Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-row items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 ${accent.hoverBg} transition-all duration-200 group hover:bg-white hover:shadow-md gap-4`}
            >
              <div className="flex-shrink-0">
                <Icon className={`w-6 h-6 ${accent.icon} group-hover:scale-110 transition-transform`} />
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-sm font-semibold text-gray-800 ${accent.title}`}>
                  {title}
                </span>
                <span className="text-[11px] text-gray-500 leading-none mt-0.5">
                  {description}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}