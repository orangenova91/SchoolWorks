"use client";

import { AnnouncementComposer } from "./AnnouncementComposer";

interface SelectedClass {
  grade: string;
  classNumber: string;
}

interface AnnouncementSectionProps {
  authorName: string;
  courseId?: string;
  boardType?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAnnouncementCreated?: () => void;
  editId?: string;
  restrictedAudience?: string;
  /** 담임반 게시판 등에서 해당 학급만 선택하도록 고정 (초기값) */
  restrictedSelectedClasses?: SelectedClass[];
}

export function AnnouncementSection({ 
  authorName,
  courseId,
  boardType,
  isOpen,
  onOpenChange,
  onAnnouncementCreated,
  editId,
  restrictedAudience,
  restrictedSelectedClasses
}: AnnouncementSectionProps) {
  const handleAnnouncementCreated = () => {
    onOpenChange?.(false);
    onAnnouncementCreated?.();
  };

  return (
    <AnnouncementComposer 
      authorName={authorName} 
      courseId={courseId}
      boardType={boardType}
      onPreview={handleAnnouncementCreated}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showButton={false}
      editId={editId}
      onEditComplete={onAnnouncementCreated}
      restrictedAudience={restrictedAudience}
      restrictedSelectedClasses={restrictedSelectedClasses}
    />
  );
}

