"use client";

import { Button } from "@/components/ui/Button";

interface AnnouncementHeaderProps {
  title: string;
  description: string;
  onWriteClick: () => void;
}

export function AnnouncementHeader({ title, description, onWriteClick }: AnnouncementHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <Button onClick={onWriteClick}>
        글쓰기
      </Button>
    </div>
  );
}

