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
};

interface BannerGridProps {
  banners: Banner[];
  onEdit: () => void;
  isEditable?: boolean;
}

export default function BannerGrid({ banners, onEdit, isEditable = true }: BannerGridProps) {
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || HelpCircle;
  };

  // 빈 배너가 아닌 것만 필터링
  const activeBanners = banners.filter(
    (banner) => banner.icon && banner.title && banner.url
  );

  if (activeBanners.length === 0) {
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
        {activeBanners.map((banner, index) => {
          const IconComponent = getIconComponent(banner.icon);
          const rawUrl = banner.url.trim();
          const hasProtocol =
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
          const looksLikeDomain =
            !rawUrl.startsWith("/") &&
            /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(rawUrl);

          const isExternal = hasProtocol || looksLikeDomain;
          const href = !hasProtocol && looksLikeDomain ? `https://${rawUrl}` : rawUrl;

          const bannerContent = (
            <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <IconComponent className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xs font-semibold text-gray-900 leading-tight">{banner.title}</h3>
            </div>
          );

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

