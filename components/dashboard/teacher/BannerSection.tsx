"use client";

import { useState, useEffect } from "react";
import BannerGrid from "./BannerGrid";
import BannerEditor, { Banner } from "./BannerEditor";

interface BannerSectionProps {
  isEditable?: boolean;
}

export default function BannerSection({ isEditable = true }: BannerSectionProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch("/api/teacher/banners");
      if (!response.ok) throw new Error("배너 조회 실패");
      const data = await response.json();
      
      // 21개의 배너 슬롯을 보장
      const defaultBanners: Banner[] = Array(21).fill(null).map(() => ({
        icon: "",
        title: "",
        url: "",
      }));
      
      if (data.banners && Array.isArray(data.banners)) {
        // 기존 배너 데이터로 채우기
        data.banners.forEach((banner: Banner, index: number) => {
          if (index < 21) {
            defaultBanners[index] = banner;
          }
        });
      }
      
      setBanners(defaultBanners);
    } catch (error) {
      console.error("배너 조회 오류:", error);
      // 오류 발생 시 기본값 설정
      setBanners(Array(21).fill(null).map(() => ({ icon: "", title: "", url: "" })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedBanners: Banner[]) => {
    try {
      const response = await fetch("/api/teacher/banners", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedBanners),
      });

      if (!response.ok) throw new Error("배너 저장 실패");

      setBanners(updatedBanners);
      setIsEditing(false);
    } catch (error) {
      console.error("배너 저장 오류:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </section>
    );
  }

  const title = "학사업무 바로가기";
  const subtitle = isEditable
    ? "모든 교사는 오른쪽 편집 기능으로 학사업무 바로가기 창을 편집할 수 있습니다."
    : "";

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {isEditable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            편집
          </button>
        )}
      </div>
      {isEditable && isEditing ? (
        <BannerEditor
          banners={banners}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <BannerGrid
          banners={banners}
          onEdit={() => isEditable && setIsEditing(true)}
          isEditable={isEditable && isEditing} // 편집 버튼을 헤더로 이동
        />
      )}
    </section>
  );
}

