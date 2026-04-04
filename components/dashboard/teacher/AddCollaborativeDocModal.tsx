"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type CollaborativeDocLinkForEdit = {
  id: string;
  title: string;
  url: string;
};

type AddCollaborativeDocModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** 수정 모드일 때 기존 링크 데이터 */
  editLink?: CollaborativeDocLinkForEdit | null;
};

export default function AddCollaborativeDocModal({
  isOpen,
  onClose,
  onSaved,
  editLink = null,
}: AddCollaborativeDocModalProps) {
  const isEditMode = !!editLink;
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (editLink) {
        setTitle(editLink.title);
        setUrl(editLink.url);
      } else {
        setTitle("");
        setUrl("");
      }
      setValidationError(null);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, editLink]);

  const handleClose = useCallback(() => {
    onClose();
    setValidationError(null);
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setValidationError(null);

      const trimmedTitle = title.trim();
      const trimmedUrl = url.trim();

      if (!trimmedTitle) {
        setValidationError("제목을 입력해주세요.");
        return;
      }

      if (!trimmedUrl) {
        setValidationError("링크 URL을 입력해주세요.");
        return;
      }

      try {
        new URL(trimmedUrl);
      } catch {
        setValidationError("올바른 URL 형식을 입력해주세요. (예: https://example.com)");
        return;
      }

      setIsSubmitting(true);

      try {
        const apiUrl = isEditMode && editLink
          ? `/api/teacher/collaborative-doc-links/${editLink.id}`
          : "/api/teacher/collaborative-doc-links";
        const method = isEditMode ? "PUT" : "POST";

        const response = await fetch(apiUrl, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            url: trimmedUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setValidationError(data.error || "저장 중 오류가 발생했습니다.");
          return;
        }

        handleClose();
        onSaved?.();
      } catch (err) {
        console.error("협업 문서 링크 저장 실패:", err);
        setValidationError("저장 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, url, isEditMode, editLink, handleClose, onSaved]
  );

  if (!mounted) return null;

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {isEditMode ? "임시 업무 Link 수정" : "임시 업무 Link 추가"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {validationError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="collab-doc-title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              제목 <span className="text-red-500">*</span>
            </label>
            <Input
              id="collab-doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 1학년 수학 협업 문서"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="collab-doc-url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              링크 URL <span className="text-red-500">*</span>
            </label>
            <Input
              id="collab-doc-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return createPortal(modalContent, document.body);
}
