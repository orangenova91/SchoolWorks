"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import EditStudentModal from "./EditStudentModal";
import { useToastContext } from "@/components/providers/ToastProvider";

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

type StudentListTableProps = {
  students: Student[];
  onUpdate?: () => void;
};

export default function StudentListTable({
  students,
  onUpdate,
}: StudentListTableProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  const handleClose = () => {
    setEditingStudent(null);
  };

  const handleSuccess = () => {
    handleClose();
    router.refresh();
    onUpdate?.();
  };

  const handleEmailClick = async (email: string, studentName: string | null) => {
    // Google Chat에서 이메일로 직접 DM을 여는 공식 URL이 없으므로
    // 새 채팅 페이지를 열고 이메일을 클립보드에 복사
    try {
      // 이메일을 클립보드에 복사
      await navigator.clipboard.writeText(email);
      
      // Google Chat 새 채팅 페이지 열기
      const googleChatUrl = `https://mail.google.com/chat/u/0/#chat/new`;
      window.open(googleChatUrl, '_blank', 'noopener,noreferrer');
      
      // 사용자에게 알림
      const name = studentName || "학생";
      showToast(`${name}의 이메일이 클립보드에 복사되었습니다. Google Chat에서 붙여넣기(Ctrl+V)로 채팅을 시작하세요.`, "info");
    } catch (err) {
      // 클립보드 복사 실패 시 fallback: mailto 링크 사용
      const mailtoUrl = `mailto:${email}`;
      window.location.href = mailtoUrl;
    }
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>등록된 학생이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                순
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                학번
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                학급직
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                전공/담당과목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.studentProfile?.studentId || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {student.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => handleEmailClick(student.email, student.name)}
                    className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1"
                    title="Google Chat으로 대화하기 (이메일이 클립보드에 복사됩니다)"
                  >
                    {student.email}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.studentProfile?.classOfficer || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.studentProfile?.major || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.studentProfile?.phoneNumber || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(student)}
                  >
                    수정
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

