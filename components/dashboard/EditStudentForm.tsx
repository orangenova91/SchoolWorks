"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import { updateStudentProfileSchema } from "@/lib/validations/student";

type FormValues = z.infer<typeof updateStudentProfileSchema>;

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

type EditStudentFormProps = {
  student: Student;
  onSuccess?: () => void;
};

const gradeOptions = [
  { value: "", label: "학년 선택" },
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" },
];

const sexOptions = [
  { value: "", label: "성별 선택" },
  { value: "남", label: "남" },
  { value: "여", label: "여" },
];

const classOfficerOptions = [
  { value: "", label: "학급직 선택" },
  { value: "반장", label: "반장" },
  { value: "부반장", label: "부반장" },
  { value: "학급회장", label: "학급회장" },
  { value: "없음", label: "없음" },
];

export default function EditStudentForm({
  student,
  onSuccess,
}: EditStudentFormProps) {
  const { showToast } = useToastContext();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(updateStudentProfileSchema),
    defaultValues: {
      name: student.name || "",
      studentId: student.studentProfile?.studentId || "",
      school: student.studentProfile?.school || "",
      grade: student.studentProfile?.grade || "",
      classLabel: student.studentProfile?.classLabel || "",
      section: student.studentProfile?.section || "",
      seatNumber: student.studentProfile?.seatNumber || "",
      major: student.studentProfile?.major || "",
      sex: student.studentProfile?.sex || "",
      classOfficer: student.studentProfile?.classOfficer || "",
      specialEducation: student.studentProfile?.specialEducation || "",
      phoneNumber: student.studentProfile?.phoneNumber || "",
      siblings: student.studentProfile?.siblings || "",
      academicStatus: student.studentProfile?.academicStatus || "",
      remarks: student.studentProfile?.remarks || "",
      club: student.studentProfile?.club || "",
      clubTeacher: student.studentProfile?.clubTeacher || "",
      clubLocation: student.studentProfile?.clubLocation || "",
      dateOfBirth: student.studentProfile?.dateOfBirth || "",
      address: student.studentProfile?.address || "",
      residentRegistrationNumber: student.studentProfile?.residentRegistrationNumber || "",
      motherName: student.studentProfile?.motherName || "",
      motherPhone: student.studentProfile?.motherPhone || "",
      motherRemarks: student.studentProfile?.motherRemarks || "",
      fatherName: student.studentProfile?.fatherName || "",
      fatherPhone: student.studentProfile?.fatherPhone || "",
      fatherRemarks: student.studentProfile?.fatherRemarks || "",
      electiveSubjects: student.studentProfile?.electiveSubjects?.join(', ') || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // electiveSubjects가 문자열인 경우 배열로 변환
      const submitData = {
        ...values,
        electiveSubjects: typeof values.electiveSubjects === 'string' 
          ? values.electiveSubjects.split(',').map(s => s.trim()).filter(s => s.length > 0)
          : values.electiveSubjects || [],
      };

      const response = await fetch(`/api/teacher/students/${student.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "학생 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      showToast("학생 정보가 성공적으로 수정되었습니다.", "success");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "학생 정보 수정 중 오류가 발생했습니다.";
      showToast(message, "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* 기본 정보 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">기본 정보</h3>
        <div className="grid gap-6 sm:grid-cols-4">
          <Input
            {...register("school")}
            label="학교"
            error={errors.school?.message}
          />
          <Input
            {...register("studentId")}
            label="학번"
            error={errors.studentId?.message}
          />
          <Input
            {...register("name")}
            label="이름"
            error={errors.name?.message}
          />
          <Select
            {...register("sex")}
            label="성별"
            options={sexOptions}
            error={errors.sex?.message}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            value={student.email}
            label="이메일"
            readOnly
            aria-readonly="true"
            tabIndex={-1}
          />
          <Input
            {...register("phoneNumber")}
            label="연락처"
            error={errors.phoneNumber?.message}
          />
        </div>
        <div>
          <Input
            {...register("dateOfBirth")}
            label="생년월일"
            type="date"
            error={errors.dateOfBirth?.message}
          />
        </div>
        <div>
          <Input
            {...register("address")}
            label="주소"
            error={errors.address?.message}
          />
        </div>
        <div>
          <Input
            {...register("residentRegistrationNumber")}
            label="주민등록번호"
            error={errors.residentRegistrationNumber?.message}
          />
        </div>
      </div>

      {/* 학적 정보 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">학적 정보</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            {...register("major")}
            label="전공/담당과목"
            error={errors.major?.message}
          />
          <Select
            {...register("classOfficer")}
            label="학급직"
            options={classOfficerOptions}
            error={errors.classOfficer?.message}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            {...register("specialEducation")}
            label="특수교육대상여부"
            error={errors.specialEducation?.message}
          />
          <Input
            {...register("academicStatus")}
            label="학적상태"
            error={errors.academicStatus?.message}
          />
        </div>
        <div>
          <Input
            {...register("siblings")}
            label="형제관계"
            error={errors.siblings?.message}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            선택과목 (쉼표로 구분)
          </label>
          <Input
            {...register("electiveSubjects" as any)}
            placeholder="예: 수학, 과학, 영어"
            error={errors.electiveSubjects?.message}
          />
          <p className="mt-1 text-xs text-gray-500">
            여러 과목을 입력할 경우 쉼표로 구분하세요
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비고
          </label>
          <textarea
            {...register("remarks")}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            placeholder="비고를 입력하세요"
          />
          {errors.remarks && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.remarks.message}
            </p>
          )}
        </div>
      </div>

      {/* 동아리 정보 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">동아리 정보</h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <Input
            {...register("club")}
            label="동아리"
            error={errors.club?.message}
          />
          <Input
            {...register("clubTeacher")}
            label="동아리 담당교사"
            error={errors.clubTeacher?.message}
          />
          <Input
            {...register("clubLocation")}
            label="동아리 활동장소"
            error={errors.clubLocation?.message}
          />
        </div>
      </div>

      {/* 가족 정보 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">가족 정보</h3>
        <div className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <Input
              {...register("motherName")}
              label="어머니 성함"
              error={errors.motherName?.message}
            />
            <Input
              {...register("motherPhone")}
              label="어머니 연락처"
              error={errors.motherPhone?.message}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              어머니 관련 비고
            </label>
            <textarea
              {...register("motherRemarks")}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="어머니 관련 비고를 입력하세요"
            />
            {errors.motherRemarks && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.motherRemarks.message}
              </p>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Input
              {...register("fatherName")}
              label="아버지 성함"
              error={errors.fatherName?.message}
            />
            <Input
              {...register("fatherPhone")}
              label="아버지 연락처"
              error={errors.fatherPhone?.message}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              아버지 관련 비고
            </label>
            <textarea
              {...register("fatherRemarks")}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="아버지 관련 비고를 입력하세요"
            />
            {errors.fatherRemarks && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.fatherRemarks.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" isLoading={isSubmitting}>
          저장하기
        </Button>
      </div>
    </form>
  );
}
