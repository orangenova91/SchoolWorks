"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { EditUserModal } from "@/components/dashboard/admin/EditUserModal";

type StaffTitleRowProps = {
  teacherSchool: string | null;
};

export function StaffTitleRow({ teacherSchool }: StaffTitleRowProps) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">교직원 명렬</h1>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UserPlus className="w-4 h-4" />
          교직원 추가
        </button>
      </div>

      <EditUserModal
        user={null}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.refresh()}
        defaultSchool={teacherSchool ?? undefined}
        fixedRole="teacher"
        createEndpoint="/api/teacher/staff"
      />
    </>
  );
}
