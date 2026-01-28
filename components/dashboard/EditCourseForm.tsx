"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

const formSchema = z.object({
  academicYear: z
    .string()
    .trim()
    .min(1, "학년도를 입력하세요")
    .max(9, "학년도가 너무 깁니다 (예: 2025)"),
  semester: z
    .string()
    .trim()
    .min(1, "학기를 선택하세요"),
  subjectGroup: z
    .string()
    .trim()
    .min(1, "교과(군)을 입력하세요")
    .max(50, "교과(군)은 50자 이하여야 합니다"),
  subjectArea: z
    .string()
    .trim()
    .min(1, "과목구분을 입력하세요")
    .max(50, "과목구분은 50자 이하여야 합니다"),
  careerTrack: z
    .string()
    .trim()
    .min(1, "교과구분을 입력하세요")
    .max(50, "교과구분은 50자 이하여야 합니다"),
  subject: z
    .string()
    .trim()
    .min(1, "과목명을 입력하세요")
    .max(50, "과목명은 50자 이하여야 합니다"),
  grade: z
    .string()
    .trim()
    .min(1, "대상 학년을 선택하세요"),
  classroom: z
    .string()
    .trim()
    .min(1, "강의실을 입력하세요")
    .max(50, "강의실은 50자 이하여야 합니다"),
  description: z
    .string()
    .trim()
    .min(1, "강의소개를 입력하세요")
    .max(1000, "강의소개는 1000자 이하여야 합니다"),
  instructor: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const gradeOptions = [
  { value: "", label: "대상 학년 선택" },
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" },
];

const semesterOptions = [
  { value: "", label: "학기 선택" },
  { value: "1학기", label: "1학기" },
  { value: "2학기", label: "2학기" },
];

type EditCourseFormProps = {
  courseId: string;
  initialData: {
    academicYear: string;
    semester: string;
    subjectGroup: string;
    subjectArea: string;
    careerTrack: string;
    subject: string;
    grade: string;
    instructor: string;
    classroom: string;
    description: string;
  };
  onCancel: () => void;
  onSuccess?: () => void;
};

export default function EditCourseForm({
  courseId,
  initialData,
  onCancel,
  onSuccess,
}: EditCourseFormProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [subjectOptions, setSubjectOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "과목명 선택" },
  ]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicYear: initialData.academicYear || "",
      semester: initialData.semester || "",
      subjectGroup: initialData.subjectGroup || "",
      subjectArea: initialData.subjectArea || "",
      careerTrack: initialData.careerTrack || "",
      subject: initialData.subject || "",
      grade: initialData.grade || "",
      classroom: initialData.classroom || "",
      description: initialData.description || "",
      instructor: initialData.instructor || "",
    },
  });

  const selectedSubject = watch("subject");
  const [useRevisedCurriculum, setUseRevisedCurriculum] = useState<boolean>(false);

  // initialData가 변경될 때 폼 값 업데이트
  useEffect(() => {
    reset({
      academicYear: initialData.academicYear || "",
      semester: initialData.semester || "",
      subjectGroup: initialData.subjectGroup || "",
      subjectArea: initialData.subjectArea || "",
      careerTrack: initialData.careerTrack || "",
      subject: initialData.subject || "",
      grade: initialData.grade || "",
      classroom: initialData.classroom || "",
      description: initialData.description || "",
      instructor: initialData.instructor || "",
    });
  }, [initialData, reset]);

  // 과목명 목록 가져오기
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch("/api/subjects");
        const data = await response.json();

        if (response.ok && data.subjects) {
          const options = [
            { value: "", label: "과목명 선택" },
            ...data.subjects.map((subject: string) => ({
              value: subject,
              label: subject,
            })),
          ];
          
          // 현재 과목명이 options에 없으면 추가
          const currentSubject = initialData.subject;
          if (currentSubject && !options.some(opt => opt.value === currentSubject)) {
            options.push({ value: currentSubject, label: currentSubject });
          }
          
          setSubjectOptions(options);
        } else {
          console.error("Failed to fetch subjects:", data.error);
          // API 실패 시에도 현재 과목명은 표시
          if (initialData.subject) {
            setSubjectOptions([
              { value: "", label: "과목명 선택" },
              { value: initialData.subject, label: initialData.subject },
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // 에러 발생 시에도 현재 과목명은 표시
        if (initialData.subject) {
          setSubjectOptions([
            { value: "", label: "과목명 선택" },
            { value: initialData.subject, label: initialData.subject },
          ]);
        }
      }
    };

    fetchSubjects();
  }, [initialData.subject]);

  // 과목명 선택 시 해당 과목의 정보 가져오기 (2022 개정 교육과정 모드일 때만)
  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!useRevisedCurriculum) return;
      if (!selectedSubject || selectedSubject === "") {
        return;
      }

      try {
        const encodedSubjectName = encodeURIComponent(selectedSubject);
        const response = await fetch(`/api/subjects/${encodedSubjectName}`);
        const data = await response.json();

        if (response.ok && data) {
          // 교과구분, 교과(군), 과목구분 자동 채우기
          if (data.careerTrack) {
            setValue("careerTrack", data.careerTrack, { shouldValidate: false });
          }
          if (data.subjectGroup) {
            setValue("subjectGroup", data.subjectGroup, { shouldValidate: false });
          }
          if (data.subjectArea) {
            setValue("subjectArea", data.subjectArea, { shouldValidate: false });
          }
        }
      } catch (error) {
        console.error("Error fetching subject details:", error);
      }
    };

    fetchSubjectDetails();
  }, [selectedSubject, setValue, useRevisedCurriculum]);

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "수업 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      showToast("수업 정보가 수정되었습니다.", "success");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "수업 정보 수정 중 오류가 발생했습니다.";
      showToast(message, "error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          {...register("academicYear")}
          label="학년도"
          error={errors.academicYear?.message}
          aria-required="true"
        />
        <Select
          {...register("semester")}
          label="학기"
          options={semesterOptions}
          error={errors.semester?.message}
          value={watch("semester") || initialData.semester || ""}
          aria-required="true"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Input
          {...register("careerTrack")}
          label="교과구분"
          placeholder="-"
          error={errors.careerTrack?.message}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          aria-required="true"
        />
        <Input
          {...register("subjectGroup")}
          label="교과(군)"
          placeholder="-"
          error={errors.subjectGroup?.message}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          aria-required="true"
        />
        <Input
          {...register("subjectArea")}
          label="과목구분"
          placeholder="-"
          error={errors.subjectArea?.message}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          aria-required="true"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              과목명 <span className="text-red-500">*</span>
            </label>
            <label className="inline-flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                className="mr-2"
                checked={useRevisedCurriculum}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseRevisedCurriculum(checked);
                  if (checked) {
                    // enable selection mode: clear subject to encourage selecting from list
                    setValue("subject", "", { shouldValidate: false });
                    setValue("careerTrack", "-", { shouldValidate: false });
                    setValue("subjectGroup", "-", { shouldValidate: false });
                    setValue("subjectArea", "-", { shouldValidate: false });
                  } else {
                    // free-text mode: keep current subject value but clear meta to placeholder
                    setValue("careerTrack", "-", { shouldValidate: false });
                    setValue("subjectGroup", "-", { shouldValidate: false });
                    setValue("subjectArea", "-", { shouldValidate: false });
                  }
                }}
              />
              2022 개정 교육과정
            </label>
          </div>
          <div className="mt-2">
            {useRevisedCurriculum ? (
              <Select
                {...register("subject")}
                options={subjectOptions}
                error={errors.subject?.message}
                aria-required="true"
              />
            ) : (
              <Input
                {...register("subject")}
                placeholder="과목명을 직접 입력하세요"
                error={errors.subject?.message}
                aria-required="true"
              />
            )}
          </div>
        </div>
        <Input
          {...register("instructor")}
          label="강사명"
          readOnly
          error={errors.instructor?.message}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          {...register("classroom")}
          label="강의실"
          placeholder="예: 본관 3층 305호"
          error={errors.classroom?.message}
          
        />
        <Select
          {...register("grade")}
          label="대상 학년"
          options={gradeOptions}
          error={errors.grade?.message}
          value={watch("grade") || initialData.grade || ""}
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          강의소개 <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("description")}
          id="description"
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          placeholder="수업에 대한 간단한 소개를 입력하세요."
          aria-required="true"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          취소
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          수정 완료
        </Button>
      </div>
    </form>
  );
}

