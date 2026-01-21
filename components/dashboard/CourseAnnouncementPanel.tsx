"use client";

import { useState } from "react";
import { AnnouncementSection } from "@/components/dashboard/AnnouncementSection";
import { AnnouncementList } from "@/components/dashboard/AnnouncementList";
import { Button } from "@/components/ui/Button";

type CourseAnnouncementPanelProps = {
  courseId: string;
  authorName: string;
};

export default function CourseAnnouncementPanel({
  courseId,
  authorName,
}: CourseAnnouncementPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAnnouncementCreated = () => {
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
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditId(undefined);
            setIsOpen(true);
          }}
        >
          새 공지 작성
        </Button>
      </div>

      <AnnouncementSection
        authorName={authorName}
        courseId={courseId}
        isOpen={isOpen}
        onOpenChange={handleClose}
        onAnnouncementCreated={handleAnnouncementCreated}
        editId={editId}
      />

      <AnnouncementList
        refreshKey={refreshKey}
        includeScheduled={true}
        courseId={courseId}
        onEdit={handleEdit}
        showEditButton={true}
        onDelete={handleDelete}
        showDeleteButton={true}
      />
    </div>
  );
}
