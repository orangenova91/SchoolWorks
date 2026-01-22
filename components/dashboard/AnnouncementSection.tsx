"use client";

import { AnnouncementComposer } from "./AnnouncementComposer";

interface AnnouncementSectionProps {
  authorName: string;
  courseId?: string;
  boardType?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAnnouncementCreated?: () => void;
  editId?: string;
  restrictedAudience?: string;
}

export function AnnouncementSection({ 
  authorName,
  courseId,
  boardType,
  isOpen,
  onOpenChange,
  onAnnouncementCreated,
  editId,
  restrictedAudience
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
    />
  );
}

