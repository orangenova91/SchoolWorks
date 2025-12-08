"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { X, Search } from "lucide-react";

type BannerBlock = {
  id: string;
  iconName?: string;
  name?: string;
  url?: string;
};

// 인기 있는 lucide-react 아이콘 목록
const popularIcons = [
  "Home",
  "Calendar",
  "User",
  "Users",
  "FileText",
  "Image",
  "Video",
  "Music",
  "Book",
  "GraduationCap",
  "School",
  "Bell",
  "Mail",
  "MessageSquare",
  "Settings",
  "Search",
  "Heart",
  "Star",
  "ThumbsUp",
  "Share2",
  "Download",
  "Upload",
  "Folder",
  "File",
  "Archive",
  "Trash2",
  "Edit",
  "Plus",
  "Check",
  "AlertCircle",
  "Info",
  "HelpCircle",
  "Lock",
  "Unlock",
  "Eye",
  "Shield",
  "Key",
  "Link",
  "ExternalLink",
  "Copy",
  "Clipboard",
  "Printer",
  "Camera",
  "Mic",
  "Monitor",
  "Smartphone",
  "Laptop",
  "Wifi",
  "Zap",
  "Sun",
  "Moon",
  "Cloud",
  "MapPin",
  "Globe",
  "Flag",
  "Award",
  "Trophy",
  "Gift",
  "ShoppingCart",
  "CreditCard",
  "TrendingUp",
  "BarChart",
  "PieChart",
  "Activity",
  "Target",
  "Grid",
  "Layout",
  "Play",
  "Pause",
  "Volume",
  "Tv",
  "Film",
  "Palette",
  "Pencil",
  "StickyNote",
].filter((iconName) => {
  // 실제로 존재하는 아이콘만 필터링
  return iconName in LucideIcons;
});

export default function BannerSection() {
  const [banners, setBanners] = useState<BannerBlock[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [editingInfoBannerId, setEditingInfoBannerId] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [bannerName, setBannerName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const handleAddBanner = () => {
    const newBanner: BannerBlock = {
      id: `banner-${Date.now()}`,
    };
    setBanners([...banners, newBanner]);
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter((banner) => banner.id !== id));
  };

  const handleEditBanner = (id: string) => {
    setEditingBannerId(id);
    setIconSearch("");
  };

  const handleEditBannerInfo = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    setEditingInfoBannerId(id);
    setBannerName(banner?.name || "");
    setBannerUrl(banner?.url || "");
  };

  const handleSaveBannerInfo = () => {
    if (editingInfoBannerId) {
      setBanners(
        banners.map((banner) =>
          banner.id === editingInfoBannerId
            ? { ...banner, name: bannerName, url: bannerUrl }
            : banner
        )
      );
      setEditingInfoBannerId(null);
      setBannerName("");
      setBannerUrl("");
    }
  };

  const handleCloseInfoModal = () => {
    setEditingInfoBannerId(null);
    setBannerName("");
    setBannerUrl("");
  };

  const handleSelectIcon = (iconName: string) => {
    if (editingBannerId) {
      setBanners(
        banners.map((banner) =>
          banner.id === editingBannerId ? { ...banner, iconName } : banner
        )
      );
      setEditingBannerId(null);
      setIconSearch("");
    }
  };

  const handleCloseModal = () => {
    setEditingBannerId(null);
    setIconSearch("");
  };

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) {
      return popularIcons;
    }
    const searchLower = iconSearch.toLowerCase();
    return popularIcons.filter((iconName) =>
      iconName.toLowerCase().includes(searchLower)
    );
  }, [iconSearch]);

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-8 h-8" /> : null;
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleAddBanner}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
        >
          배너 추가
        </button>
      </div>

      {banners.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {banners.map((banner) => {
            const BannerContent = banner.url ? (
              <Link
                href={banner.url}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                {banner.iconName ? (
                  <div className="text-gray-700 mb-1">
                    {getIconComponent(banner.iconName)}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mb-1">배너 블록</span>
                )}
                {banner.name && (
                  <span className="text-xs text-gray-700 font-medium text-center px-1">
                    {banner.name}
                  </span>
                )}
              </Link>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {banner.iconName ? (
                  <div className="text-gray-700 mb-1">
                    {getIconComponent(banner.iconName)}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mb-1">배너 블록</span>
                )}
                {banner.name && (
                  <span className="text-xs text-gray-700 font-medium text-center px-1">
                    {banner.name}
                  </span>
                )}
              </div>
            );

            return (
              <div
                key={banner.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 min-h-[100px] flex flex-col items-center justify-center w-[12.5%] relative"
              >
                <div className="absolute top-1 right-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteBanner(banner.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="삭제"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditBannerInfo(banner.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="이름/URL 편집"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditBanner(banner.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="아이콘 편집"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
                {BannerContent}
              </div>
            );
          })}
        </div>
      )}

      {/* 이름/URL 편집 모달 */}
      {editingInfoBannerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">배너 정보 편집</h2>
              <button
                onClick={handleCloseInfoModal}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  배너 이름
                </label>
                <input
                  type="text"
                  placeholder="배너 이름을 입력하세요"
                  value={bannerName}
                  onChange={(e) => setBannerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com 또는 /dashboard/..."
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  외부 URL 또는 내부 경로를 입력할 수 있습니다
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={handleCloseInfoModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveBannerInfo}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 아이콘 선택 모달 */}
      {editingBannerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">아이콘 선택</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="아이콘 검색..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              {iconSearch && (
                <p className="text-xs text-gray-500 mt-2">
                  {filteredIcons.length}개의 아이콘을 찾았습니다
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredIcons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>"{iconSearch}"에 해당하는 아이콘을 찾을 수 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-3">
                  {filteredIcons.map((iconName) => {
                  const IconComponent = (LucideIcons as any)[iconName];
                  if (!IconComponent) return null;
                  return (
                    <button
                      key={iconName}
                      onClick={() => handleSelectIcon(iconName)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      title={iconName}
                    >
                      <IconComponent className="w-6 h-6 text-gray-700 mb-1" />
                      <span className="text-xs text-gray-600 truncate w-full text-center">
                        {iconName}
                      </span>
                    </button>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

