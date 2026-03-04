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

// 편집 화면에서 허용할 최대 배너 줄 수 및 한 줄 칸 수
const MAX_ROWS = 4;
const COLUMNS = 7;

export type Banner = {
  icon: string;
  title: string;
  url: string;
};

interface BannerEditorProps {
  banners: Banner[];
  rows: number;
  onSave: (payload: { banners: Banner[]; rows: number }) => Promise<void>;
  onCancel: () => void;
}

export default function BannerEditor({
  banners,
  rows: initialRows,
  onSave,
  onCancel,
}: BannerEditorProps) {
  const [editedBanners, setEditedBanners] = useState<Banner[]>(banners);
  const [rows, setRows] = useState<number>(initialRows);
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
      await onSave({ banners: editedBanners, rows });
      showToast("배너가 저장되었습니다.", "success");
    } catch (error) {
      showToast("배너 저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIncreaseRows = () => {
    if (rows >= MAX_ROWS) {
      showToast(`배너 줄 수는 최대 ${MAX_ROWS}줄까지 설정할 수 있습니다.`, "error");
      return;
    }
    setRows((prev) => prev + 1);
  };

  const handleRemoveBanner = (index: number) => {
    const updated = [...editedBanners];
    // 인덱스를 유지하면서 해당 위치를 비워서, 그리드 상 위치가 당겨지지 않도록 처리
    updated[index] = { icon: "", title: "", url: "" };
    setEditedBanners(updated);
  };

  const handleDecreaseRows = () => {
    if (rows <= 1) return;

    const newRows = rows - 1;
    const start = newRows * COLUMNS;
    const end = rows * COLUMNS;

    const hasContentInLastRow = editedBanners
      .slice(start, end)
      .some(
        (banner) =>
          banner &&
          ((banner.icon && banner.icon.trim() !== "") ||
            (banner.title && banner.title.trim() !== "") ||
            (banner.url && banner.url.trim() !== ""))
      );

    if (hasContentInLastRow) {
      showToast(
        "마지막 줄의 배너 내용을 모두 비워야 줄 수를 줄일 수 있습니다.",
        "error"
      );
      return;
    }

    setRows(newRows);
  };

  const slotCount = rows * COLUMNS;

  const getIconComponent = (iconName: string) => {
    const icon = availableIcons.find((i) => i.name === iconName);
    return icon ? icon.component : HelpCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">배너 편집</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>줄 수</span>
            <button
              type="button"
              onClick={handleDecreaseRows}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:opacity-50"
              disabled={rows <= 1}
            >
              -
            </button>
            <span className="text-sm font-semibold text-gray-800">{rows}</span>
            <span className="text-[11px] text-gray-400">/ {MAX_ROWS}</span>
            <button
              type="button"
              onClick={handleIncreaseRows}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:opacity-50"
              disabled={rows >= MAX_ROWS}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: slotCount }, (_, index) => {
          const banner = editedBanners[index] ?? { icon: "", title: "", url: "" };
          const IconComponent = getIconComponent(banner.icon);
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  배너 {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBanner(index)}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`배너 ${index + 1} 삭제`}
                  >
                    <X className="w-4 h-4" />
                  </button>
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

