"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Download, Edit2 } from "lucide-react";
import { EditStudentModal, type StudentWithProfile } from "./EditStudentModal";

type StudentListTableProps = {
  students: StudentWithProfile[];
};

export default function StudentListTable({ students }: StudentListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("");
  const [selectedClassLabelFilter, setSelectedClassLabelFilter] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 학생들의 고유한 학년 목록
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((student) => {
      const grade = student.grade?.trim();
      if (grade && grade !== "-") {
        grades.add(grade);
      }
    });
    return Array.from(grades).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }, [students]);

  // 학생들의 고유한 학반 목록
  const uniqueClassLabels = useMemo(() => {
    const labels = new Set<string>();
    students.forEach((student) => {
      const classLabel = student.classLabel?.trim();
      if (classLabel && classLabel !== "-") {
        labels.add(classLabel);
      }
    });
    return Array.from(labels).sort();
  }, [students]);

  // 검색 및 학년/학반 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    let result = students;

    // 학년 필터 적용
    if (selectedGradeFilter) {
      result = result.filter((student) => {
        const studentGrade = student.grade?.trim() || "";
        return studentGrade === selectedGradeFilter;
      });
    }

    // 학반 필터 적용
    if (selectedClassLabelFilter) {
      result = result.filter((student) => {
        const studentClassLabel = student.classLabel?.trim() || "";
        return studentClassLabel === selectedClassLabelFilter;
      });
    }

    // 검색 필터 적용 (콤마로 구분된 다중 검색어 지원)
    if (searchQuery.trim()) {
      // 콤마로 구분하여 검색어 배열 생성
      const searchTerms = searchQuery
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0); // 빈 검색어 제거

      if (searchTerms.length > 0) {
        result = result.filter((student) => {
          const studentName = student.name?.toLowerCase() || '';
          const studentEmail = student.email.toLowerCase();
          const studentId = student.studentId?.toLowerCase() || '';
          
          // 여러 검색어 중 하나라도 포함되면 표시 (OR 검색)
          return searchTerms.some(term => 
            studentName.includes(term) || 
            studentEmail.includes(term) ||
            studentId.includes(term)
          );
        });
      }
    }

    return result;
  }, [students, searchQuery, selectedGradeFilter, selectedClassLabelFilter]);

  // 편집 시작
  const handleStartEdit = (student: StudentWithProfile) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  // 저장 성공 핸들러
  const handleSaveSuccess = () => {
    router.refresh();
    handleCloseModal();
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더
    const headers = ["학번", "이름", "성별", "학반", "이메일", "연락처"];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...filteredStudents.map((student) => {
        // CSV에서 특수문자 처리 및 Excel 날짜 변환 방지
        const escapeCSV = (value: string, preventDateConversion = false) => {
          if (value === "-") return '""';
          const stringValue = String(value);
          
          // Excel이 날짜로 변환할 수 있는 패턴 감지 (숫자-하이픈-숫자, 숫자/숫자 등)
          const mightBeDate = /^\d+[-/]\d+/.test(stringValue.trim());
          
          // 날짜로 변환될 수 있는 값이거나 강제 방지가 필요한 경우
          if (preventDateConversion || mightBeDate) {
            // 값 앞에 작은따옴표를 추가하고 큰따옴표로 감싸기
            // Excel은 값 앞의 작은따옴표를 인식하여 텍스트로 강제함
            return `"\t${stringValue.replace(/"/g, '""')}"`;
          }
          
          // 일반적인 경우 큰따옴표로 감싸기
          return `"${stringValue.replace(/"/g, '""')}"`;
        };

        return [
          escapeCSV(student.studentId, true), // 학번: 텍스트로 강제
          escapeCSV(student.name),
          escapeCSV(student.sex),
          escapeCSV(student.classLabel, true), // 학반: 텍스트로 강제 (날짜 변환 방지)
          escapeCSV(student.email),
          escapeCSV(student.phoneNumber, true), // 연락처: 텍스트로 강제
        ].join(",");
      }),
    ];

    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // 파일명 생성 (필터 정보 포함)
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    let filename = `학생명렬_${dateStr}`;
    
    if (selectedGradeFilter || selectedClassLabelFilter || searchQuery.trim()) {
      const filters = [];
      if (selectedGradeFilter) filters.push(`${selectedGradeFilter}학년`);
      if (selectedClassLabelFilter) filters.push(`${selectedClassLabelFilter}학반`);
      if (searchQuery.trim()) filters.push(`검색_${searchQuery.substring(0, 10)}`);
      filename += `_${filters.join("_")}`;
    }
    
    filename += ".csv";

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학생 이름, 이메일 또는 학번으로 검색 (콤마로 구분: 김철수, 이영희)"
              className="w-full"
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { value: "", label: "전체 학년" },
                ...uniqueGrades.map((grade) => ({
                  value: grade,
                  label: `${grade}학년`,
                })),
              ]}
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              disabled={uniqueGrades.length === 0}
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { value: "", label: "전체 학반" },
                ...uniqueClassLabels.map((label) => ({
                  value: label,
                  label: label,
                })),
              ]}
              value={selectedClassLabelFilter}
              onChange={(e) => setSelectedClassLabelFilter(e.target.value)}
              disabled={uniqueClassLabels.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">총 {students.length}명</span>
          <span className="mx-2">중</span>
          <span className="font-semibold text-orange-600">{filteredStudents.length}명</span>
          <span className="ml-1">표시됨</span>
        </div>
        <div className="flex items-center gap-3">
          {(searchQuery.trim() || selectedGradeFilter || selectedClassLabelFilter) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {searchQuery.trim() && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  검색: "{searchQuery}"
                </span>
              )}
              {selectedGradeFilter && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  {selectedGradeFilter}학년
                </span>
              )}
              {selectedClassLabelFilter && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  {selectedClassLabelFilter}학반
                </span>
              )}
            </div>
          )}
          {filteredStudents.length > 0 && (
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                학번
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                이름
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                성별
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 학생이 없습니다."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.studentId}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.sex}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.phoneNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(student)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="편집"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EditStudentModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSaveSuccess}
      />
    </section>
  );
}

