"use client";

import { useState } from "react";
import CounselingRecordForm from "./CounselingRecordForm";
import CounselingRecordList from "./CounselingRecordList";

type CounselingManagementProps = {
  hasHomeroom: boolean;
  students?: any[];
  classLabel?: string;
};

export default function CounselingManagement({
  hasHomeroom,
  students = [],
  classLabel = "",
}: CounselingManagementProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!hasHomeroom) {
    return (
      <div className="text-sm text-gray-600">
        <p>담임반 정보가 없습니다. 담임반을 먼저 설정해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      <div className="flex-1 shrink-0 overflow-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">상담기록 등록</h3>
        <CounselingRecordForm
          students={students}
          onSuccess={() => setRefreshTrigger((n) => n + 1)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 shrink-0 text-base font-semibold text-gray-900">상담기록 목록</h3>
        <div className="min-h-0 flex-1">
          <CounselingRecordList
            classLabel={classLabel}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
