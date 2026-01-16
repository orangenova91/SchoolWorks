"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import UpdateHomeroomForm from "@/components/dashboard/UpdateHomeroomForm";
import { Button } from "@/components/ui/Button";

type UpdateHomeroomModalButtonProps = {
  initialClassLabel?: string | null;
};

export default function UpdateHomeroomModalButton({
  initialClassLabel,
}: UpdateHomeroomModalButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative w-full max-w-lg max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">학반 생성</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            닫기
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
          <UpdateHomeroomForm
            initialClassLabel={initialClassLabel}
            onSuccess={handleClose}
            onUpdated={handleUpdated}
            onCancel={handleClose}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button variant="primary" type="button" onClick={handleOpen}>
        학반 생성
      </Button>

      {mounted && typeof window !== "undefined" && createPortal(
        modalContent,
        document.body
      )}
    </>
  );
}

