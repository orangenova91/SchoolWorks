"use client";

import Link from "next/link";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  Home,
  GraduationCap,
  ClipboardList,
  Award,
  Bell,
  Search,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Edit,
  UtensilsCrossed,
  Coffee,
  Radio,
  Mic,
  ClipboardCheck,
  ListChecks,
  FileSearch,
  User,
  UserCircle,
  UsersRound,
} from "lucide-react";
import { Banner } from "./BannerEditor";

// 사용 가능한 아이콘 목록
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  Home,
  GraduationCap,
  ClipboardList,
  Award,
  Bell,
  Search,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  LinkIcon,
  UtensilsCrossed,
  Coffee,
  Radio,
  Mic,
  ClipboardCheck,
  ListChecks,
  FileSearch,
  User,
  UserCircle,
  UsersRound,
};

interface BannerGridProps {
  banners: Banner[];
  rows: number;
  onEdit: () => void;
  isEditable?: boolean;
}

const COLUMNS = 7;

export default function BannerGrid({ banners, rows, onEdit, isEditable = true }: BannerGridProps) {
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || HelpCircle;
  };

  const slotCount = Math.max(1, Math.min(rows, 4)) * COLUMNS;
  const normalizedBanners: Banner[] = Array.from({ length: slotCount }, (_, index) =>
    banners[index] ?? { icon: "", title: "", url: "" }
  );

  // 한 개라도 활성 배너가 있는지 여부만 판단
  const hasActiveBanner = normalizedBanners.some(
    (banner) => banner.icon && banner.title && banner.url
  );

  if (!hasActiveBanner) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">설정된 배너가 없습니다.</p>
        {isEditable && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <Edit className="w-4 h-4" />
            배너 편집
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEditable && (
        <div className="flex justify-end">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            편집
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {normalizedBanners.map((banner, index) => {
          const isEmpty = !banner.icon && !banner.title && !banner.url;
          const IconComponent = getIconComponent(banner.icon);
          const rawUrl = banner.url.trim();
          const hasProtocol =
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
          const looksLikeDomain =
            !rawUrl.startsWith("/") &&
            /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(rawUrl);

          const isExternal = hasProtocol || looksLikeDomain;
          const href = !hasProtocol && looksLikeDomain ? `https://${rawUrl}` : rawUrl;

          const bannerContent = isEmpty ? (
            // 빈 슬롯: 위치는 유지하되, 옅은 테두리의 placeholder 박스로 표시
            <div className="group relative border border-dashed border-gray-200 rounded-lg p-3 h-full flex flex-col items-center justify-center text-center text-[11px] text-gray-400 bg-gray-50/40">
              <div className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 mb-1 bg-white">
                <span className="text-lg leading-none">+</span>
              </div>
              <span>비어 있는 배너 슬롯</span>
            </div>
          ) : (
            <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <IconComponent className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{banner.title}</h3>
            </div>
          );

          // 비어 있는 슬롯은 단순 placeholder이므로 링크 없이 그대로 렌더링
          if (isEmpty) {
            return (
              <div key={index} className="block">
                {bannerContent}
              </div>
            );
          }

          if (isExternal) {
            return (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {bannerContent}
              </a>
            );
          }

          return (
            <Link key={index} href={href || "#"} className="block">
              {bannerContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

