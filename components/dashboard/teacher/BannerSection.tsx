"use client";

import { useState, useEffect, useMemo } from "react";
import BannerGrid from "./BannerGrid";
import BannerEditor, { Banner } from "./BannerEditor";
import BannerSlotModal from "./BannerSlotModal";
import {
  BANNER_DEFAULT_ROWS,
  BANNER_MAX_ROWS,
} from "@/lib/bannerConstants";

interface BannerSectionProps {
  isEditable?: boolean;
}

export default function BannerSection({ isEditable = true }: BannerSectionProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [rows, setRows] = useState<number>(BANNER_DEFAULT_ROWS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalSlotIndex, setModalSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch("/api/teacher/banners");
      if (!response.ok) throw new Error("배너 조회 실패");
      const data = await response.json();

      const serverBanners: Banner[] = Array.isArray(data.banners)
        ? data.banners
        : [];

      setBanners(serverBanners);
      const serverRows =
        typeof data.rows === "number" &&
        data.rows >= 1 &&
        data.rows <= BANNER_MAX_ROWS
          ? data.rows
          : BANNER_DEFAULT_ROWS;
      setRows(serverRows);
    } catch (error) {
      console.error("배너 조회 오류:", error);
      setBanners([]);
      setRows(BANNER_DEFAULT_ROWS);
    } finally {
      setIsLoading(false);
    }
  };

  const persistBanners = async (nextBanners: Banner[], nextRows: number) => {
    const response = await fetch("/api/teacher/banners", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        banners: nextBanners,
        rows: nextRows,
      }),
    });

    if (!response.ok) throw new Error("배너 저장 실패");

    setBanners(nextBanners);
    setRows(nextRows);
  };

  const handleSave = async (payload: { banners: Banner[]; rows: number }) => {
    const { banners: updatedBanners, rows: updatedRows } = payload;
    try {
      await persistBanners(updatedBanners, updatedRows);
      setIsEditing(false);
    } catch (error) {
      console.error("배너 저장 오류:", error);
      throw error;
    }
  };

  const handleModalSave = async (banner: Banner) => {
    if (modalSlotIndex === null) return;
    const next = [...banners];
    while (next.length <= modalSlotIndex) {
      next.push({ icon: "", title: "", url: "" });
    }
    next[modalSlotIndex] = banner;
    await persistBanners(next, rows);
  };

  const modalInitialBanner = useMemo((): Banner => {
    if (modalSlotIndex === null) {
      return { icon: "", title: "", url: "" };
    }
    return {
      icon: banners[modalSlotIndex]?.icon ?? "",
      title: banners[modalSlotIndex]?.title ?? "",
      url: banners[modalSlotIndex]?.url ?? "",
    };
  }, [modalSlotIndex, banners]);

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
          rows={rows}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <BannerGrid
          banners={banners}
          rows={rows}
          onEdit={() => isEditable && setIsEditing(true)}
          onEmptySlotClick={
            isEditable ? (slotIndex) => setModalSlotIndex(slotIndex) : undefined
          }
          isEditable={isEditable}
        />
      )}

      {modalSlotIndex !== null && (
        <BannerSlotModal
          key={modalSlotIndex}
          slotLabel={`슬롯 ${modalSlotIndex + 1}`}
          initialBanner={modalInitialBanner}
          onClose={() => setModalSlotIndex(null)}
          onSave={handleModalSave}
        />
      )}
    </section>
  );
}
