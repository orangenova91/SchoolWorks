"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import EditStudentForm from "./EditStudentForm";

type Student = {
  id: string;
  name: string | null;
  email: string;
  studentProfile: {
    studentId: string | null;
    school: string | null;
    grade: string | null;
    classLabel: string | null;
    section: string | null;
    seatNumber: string | null;
    major: string | null;
    sex: string | null;
    classOfficer: string | null;
    specialEducation: string | null;
    phoneNumber: string | null;
    siblings: string | null;
    academicStatus: string | null;
    remarks: string | null;
    club: string | null;
    clubTeacher: string | null;
    clubLocation: string | null;
    dateOfBirth: string | null;
    address: string | null;
    residentRegistrationNumber: string | null;
    motherName: string | null;
    motherPhone: string | null;
    motherRemarks: string | null;
    fatherName: string | null;
    fatherPhone: string | null;
    fatherRemarks: string | null;
    electiveSubjects: string[] | null;
  } | null;
};

type EditStudentModalProps = {
  student: Student;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function EditStudentModal({
  student,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = () => {
    onSuccess?.();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            학생 정보 수정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            닫기
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
          <EditStudentForm student={student} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof window === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
}

