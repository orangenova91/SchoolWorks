"use client";

import { useState } from "react";
import { AnnouncementHeader } from "@/components/dashboard/AnnouncementHeader";
import { AnnouncementSection } from "@/components/dashboard/AnnouncementSection";
import { AnnouncementList } from "@/components/dashboard/AnnouncementList";

interface AnnouncementPageClientProps {
  title: string;
  description: string;
  authorName: string;
  includeScheduled?: boolean;
  audience?: string;
}

export function AnnouncementPageClient({ 
  title, 
  description, 
  authorName, 
  includeScheduled = true,
  audience
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
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white space-y-6">
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
          isOpen={isOpen}
          onOpenChange={handleClose}
          onAnnouncementCreated={handleAnnouncementCreated}
          editId={editId}
        />
      </div>
      
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안내문 목록</h2>
        <AnnouncementList 
          refreshKey={refreshKey} 
          includeScheduled={includeScheduled}
          audience={audience}
          onEdit={handleEdit}
          showEditButton={true}
          onDelete={handleDelete}
          showDeleteButton={true}
        />
      </div>
    </div>
  );
}

