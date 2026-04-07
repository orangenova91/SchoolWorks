"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { AVAILABLE_BANNER_ICONS, HelpCircle } from "@/components/dashboard/teacher/bannerIcons";
import type { Banner } from "./BannerEditor";

type BannerSlotModalProps = {
  onClose: () => void;
  slotLabel: string;
  initialBanner: Banner;
  onSave: (banner: Banner) => Promise<void>;
};

export default function BannerSlotModal({
  onClose,
  slotLabel,
  initialBanner,
  onSave,
}: BannerSlotModalProps) {
  const [draft, setDraft] = useState<Banner>(() => ({ ...initialBanner }));
  const [saving, setSaving] = useState(false);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!iconDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIconDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [iconDropdownOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const IconComponent =
    AVAILABLE_BANNER_ICONS.find((i) => i.name === draft.icon)?.component ?? HelpCircle;

  const handleSave = async () => {
    const icon = draft.icon.trim();
    const title = draft.title.trim();
    const url = draft.url.trim();
    if (!icon || !title || !url) {
      showToast("아이콘, 제목, URL을 모두 입력해 주세요.", "error");
      return;
    }
    setSaving(true);
    try {
      await onSave({ icon, title, url });
      showToast("배너가 저장되었습니다.", "success");
      onClose();
    } catch {
      showToast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-slot-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 shrink-0">
          <h2 id="banner-slot-modal-title" className="text-base font-semibold text-gray-900">
            배너 입력 · {slotLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="모달 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">아이콘</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIconDropdownOpen((v) => !v)}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white flex items-center gap-2 text-left overflow-hidden"
              >
                <IconComponent className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="min-w-0 truncate">{draft.icon || "아이콘 선택"}</span>
              </button>
              {iconDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 py-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((d) => ({ ...d, icon: "" }));
                      setIconDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-100 text-gray-500 whitespace-nowrap"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    아이콘 선택
                  </button>
                  {[...AVAILABLE_BANNER_ICONS]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((icon) => {
                      const IconItem = icon.component;
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => {
                            setDraft((d) => ({ ...d, icon: icon.name }));
                            setIconDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-100 text-gray-900"
                        >
                          <IconItem className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          {icon.name}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="배너 제목"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL 주소</label>
            <input
              type="text"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="/dashboard/teacher/..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
