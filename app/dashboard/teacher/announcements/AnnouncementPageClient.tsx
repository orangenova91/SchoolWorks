"use client";

import { useState } from "react";
import { AnnouncementHeader } from "@/components/dashboard/AnnouncementHeader";
import { AnnouncementSection } from "@/components/dashboard/AnnouncementSection";
import { AnnouncementList } from "@/components/dashboard/AnnouncementList";

interface SelectedClass {
  grade: string;
  classNumber: string;
}

interface AnnouncementPageClientProps {
  title: string;
  description: string;
  authorName: string;
  includeScheduled?: boolean;
  audience?: string;
  boardType?: string;
  courseId?: string;
  /** 담임반 게시판에서 해당 학급만 조회 (e.g. "1-3") */
  homeroomClassKey?: string;
  /** 담임반 게시판 작성 시 선택 고정 학급 */
  restrictedSelectedClasses?: SelectedClass[];
  showGradeTabs?: boolean;
}

export function AnnouncementPageClient({ 
  title, 
  description, 
  authorName, 
  includeScheduled = true,
  audience,
  boardType,
  courseId,
  homeroomClassKey,
  restrictedSelectedClasses,
  showGradeTabs = false
}: AnnouncementPageClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAnnouncementCreated = () => {
    // 목록 새로고침을 위해 key 변경
    setRefreshKey((prev) => prev + 1);
    setEditId(undefined);
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditId(undefined);
  };

  const handleDelete = () => {
    // 목록 새로고침을 위해 key 변경
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <AnnouncementHeader 
          title={title} 
          description={description} 
          onWriteClick={() => {
            setEditId(undefined);
            setIsOpen(true);
          }} 
        />
        <AnnouncementSection 
          authorName={authorName} 
          courseId={courseId}
          boardType={boardType}
          isOpen={isOpen}
          onOpenChange={handleClose}
          onAnnouncementCreated={handleAnnouncementCreated}
          editId={editId}
          restrictedAudience={audience}
          restrictedSelectedClasses={restrictedSelectedClasses}
        />
      </header>
      
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안내문 목록</h2>
        <AnnouncementList 
          refreshKey={refreshKey} 
          includeScheduled={includeScheduled}
          audience={audience}
          boardType={boardType}
          courseId={courseId}
          homeroomClassKey={homeroomClassKey}
          showGradeTabs={showGradeTabs}
          onEdit={handleEdit}
          showEditButton={true}
          onDelete={handleDelete}
          showDeleteButton={true}
        />
      </div>
    </div>
  );
}

