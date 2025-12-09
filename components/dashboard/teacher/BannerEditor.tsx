"use client";

import { useState, useEffect } from "react";
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
  Save,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// 사용 가능한 아이콘 목록
const availableIcons = [
  { name: "BookOpen", component: BookOpen },
  { name: "Users", component: Users },
  { name: "Calendar", component: Calendar },
  { name: "FileText", component: FileText },
  { name: "Settings", component: Settings },
  { name: "BarChart3", component: BarChart3 },
  { name: "MessageSquare", component: MessageSquare },
  { name: "Home", component: Home },
  { name: "GraduationCap", component: GraduationCap },
  { name: "ClipboardList", component: ClipboardList },
  { name: "Award", component: Award },
  { name: "Bell", component: Bell },
  { name: "Search", component: Search },
  { name: "HelpCircle", component: HelpCircle },
  { name: "Mail", component: Mail },
  { name: "Phone", component: Phone },
  { name: "MapPin", component: MapPin },
  { name: "LinkIcon", component: LinkIcon },
];

export type Banner = {
  icon: string;
  title: string;
  url: string;
};

interface BannerEditorProps {
  banners: Banner[];
  onSave: (banners: Banner[]) => Promise<void>;
  onCancel: () => void;
}

export default function BannerEditor({ banners, onSave, onCancel }: BannerEditorProps) {
  const [editedBanners, setEditedBanners] = useState<Banner[]>(banners);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleBannerChange = (index: number, field: keyof Banner, value: string) => {
    const updated = [...editedBanners];
    updated[index] = { ...updated[index], [field]: value };
    setEditedBanners(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedBanners);
      showToast("배너가 저장되었습니다.", "success");
    } catch (error) {
      showToast("배너 저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icon = availableIcons.find((i) => i.name === iconName);
    return icon ? icon.component : HelpCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">배너 편집</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {editedBanners.map((banner, index) => {
          const IconComponent = getIconComponent(banner.icon);
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">배너 {index + 1}</span>
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    아이콘
                  </label>
                  <select
                    value={banner.icon}
                    onChange={(e) => handleBannerChange(index, "icon", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">아이콘 선택</option>
                    {availableIcons.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    제목
                  </label>
                  <input
                    type="text"
                    value={banner.title}
                    onChange={(e) => handleBannerChange(index, "title", e.target.value)}
                    placeholder="배너 제목"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    URL 주소
                  </label>
                  <input
                    type="text"
                    value={banner.url}
                    onChange={(e) => handleBannerChange(index, "url", e.target.value)}
                    placeholder="/dashboard/teacher/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

