"use client";

import { useState } from "react";
import AssignmentForm from "./AssignmentForm";
import AssignmentList from "./AssignmentList";
import { Button } from "@/components/ui/Button";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  filePath: string | null;
  originalFileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: {
    id?: string;
    filePath: string;
    originalFileName: string;
    fileSize: number | null;
    mimeType: string | null;
  }[];
}

interface AssignmentManagerProps {
  courseId: string;
}

export default function AssignmentManager({ courseId }: AssignmentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setShowForm(false);
    setEditingAssignment(null);
    setRefreshKey((prev) => prev + 1); // 목록 새로고침 트리거
  };

  type IncomingAssignment = {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    // From AssignmentList
    attachments?: {
      id?: string;
      filePath: string;
      originalFileName: string;
      fileSize: number | null;
      mimeType: string | null;
    }[];
    // Legacy single-file fields (if provided)
    filePath?: string | null;
    originalFileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  };

  const handleEdit = (assignment: IncomingAssignment) => {
    const firstAttachment = assignment.attachments?.[0];
    const normalized: Assignment = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      filePath: assignment.filePath ?? firstAttachment?.filePath ?? null,
      originalFileName:
        assignment.originalFileName ?? firstAttachment?.originalFileName ?? null,
      fileSize: assignment.fileSize ?? firstAttachment?.fileSize ?? null,
      mimeType: assignment.mimeType ?? firstAttachment?.mimeType ?? null,
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      attachments: assignment.attachments ?? [],
    };
    setEditingAssignment(normalized);
    setShowForm(false);
  };

  const handleCloseEdit = () => {
    setEditingAssignment(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">자료 목록</h3>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingAssignment(null);
          }}
        >
          {showForm ? "닫기" : "새 자료 생성"}
        </Button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowForm(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">자료 생성</h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                닫기
              </button>
            </div>
            <AssignmentForm courseId={courseId} onSuccess={handleSuccess} />
          </div>
        </div>
      )}

      {editingAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseEdit}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">자료 수정</h4>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                닫기
              </button>
            </div>
            <AssignmentForm
              courseId={courseId}
              assignmentId={editingAssignment.id}
              initialData={{
                title: editingAssignment.title,
                description: editingAssignment.description,
                dueDate: editingAssignment.dueDate,
                originalFileName: editingAssignment.originalFileName,
                filePath: editingAssignment.filePath,
                attachments: editingAssignment.attachments,
              }}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}

      {!editingAssignment && (
        <AssignmentList
          key={refreshKey}
          courseId={courseId}
          onEdit={handleEdit}
          onDelete={handleSuccess}
        />
      )}
    </div>
  );
}

