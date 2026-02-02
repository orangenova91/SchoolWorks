"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

const createFormSchema = (isAfterSchool: boolean) =>
  z.object({
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
    // 방과후는 '대상 학년' 입력을 받지 않으므로 필수 검증에서 제외 (빈 문자열 저장)
    grade: isAfterSchool
      ? z.string().trim().optional()
      : z.string().trim().min(1, "대상 학년을 선택하세요"),
    classroom: z
      .string()
      .trim()
      .max(50, "강의실은 50자 이하여야 합니다")
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, "강의소개를 입력하세요")
      .max(1000, "강의소개는 1000자 이하여야 합니다"),
    writtenTestRatio: z
      .number()
      .min(0, "지필평가 비율은 0 이상이어야 합니다")
      .max(100, "지필평가 비율은 100 이하여야 합니다")
      .optional(),
    performanceTestRatio: z
      .number()
      .min(0, "수행평가 비율은 0 이상이어야 합니다")
      .max(100, "수행평가 비율은 100 이하여야 합니다")
      .optional(),
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

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

type CreateClassFormProps = {
  instructorName: string;
  courseType?: "regular" | "after_school";
  onSuccess?: () => void;
  onCreated?: (course: {
    id: string;
    courseType?: string;
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
    joinCode: string | null;
    createdAt: string;
  }) => void;
};

export default function CreateClassForm({
  instructorName,
  courseType = "regular",
  onSuccess,
  onCreated,
}: CreateClassFormProps) {
  const { showToast } = useToastContext();
  const currentYear = new Date().getFullYear();
  const isAfterSchool = courseType === "after_school";
  const [showClassGroup, setShowClassGroup] = useState(true);
  const [cgName, setCgName] = useState("");
  const [cgPeriod, setCgPeriod] = useState("1");
  const [cgSchedules, setCgSchedules] = useState<Array<{ day: string; period: string }>>([
    { day: "", period: "" },
  ]);
  const [cgErrors, setCgErrors] = useState<{ name?: string; period?: string; schedules?: string }>(
    {}
  );

  const cgDaysOfWeek = [
    { value: "", label: "요일 선택" },
    { value: "월", label: "월요일" },
    { value: "화", label: "화요일" },
    { value: "수", label: "수요일" },
    { value: "목", label: "목요일" },
    { value: "금", label: "금요일" },
  ];

  const cgPeriodsOptions = Array.from({ length: 10 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}교시`,
  }));

  const handleCgPeriodChange = (value: string) => {
    setCgPeriod(value);
    const periodCount = parseInt(value, 10) || 0;
    if (periodCount > 0) {
      setCgSchedules((prev) => {
        const newSchedules = Array.from({ length: periodCount }, (_, index) => {
          return prev[index] || { day: "", period: "" };
        });
        return newSchedules;
      });
    }
  };

  const handleCgScheduleChange = (index: number, field: "day" | "period", value: string) => {
    setCgSchedules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
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
    resolver: zodResolver(createFormSchema(isAfterSchool)),
    defaultValues: {
      academicYear: `${currentYear}`,
      semester: "",
      subjectGroup: "-",
      subjectArea: "-",
      careerTrack: "-",
      subject: "",
      grade: "",
      classroom: "",
      description: "",
      writtenTestRatio: 60,
      performanceTestRatio: 40,
    },
  });

  const writtenTestRatio = watch("writtenTestRatio") ?? 60;
  const performanceTestRatio = watch("performanceTestRatio") ?? 40;
  const selectedSubject = watch("subject");
  const [useRevisedCurriculum, setUseRevisedCurriculum] = useState<boolean>(false);

  // 과목명 목록 가져오기 (방과후는 단순 입력 위주라 생략)
  useEffect(() => {
    if (isAfterSchool) return;
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
          setSubjectOptions(options);
        } else {
          console.error("Failed to fetch subjects:", data.error);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, []);

  // 과목명 선택 시 해당 과목의 정보 가져오기 (단, 2022 개정 교육과정 선택 시에만 동작)
  useEffect(() => {
    if (isAfterSchool) return;
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
  }, [isAfterSchool, selectedSubject, setValue, useRevisedCurriculum]);

  const handleWrittenTestChange = (value: number) => {
    setValue("writtenTestRatio", value, { shouldValidate: true });
    setValue("performanceTestRatio", 100 - value, { shouldValidate: true });
  };

  const handlePerformanceTestChange = (value: number) => {
    setValue("performanceTestRatio", value, { shouldValidate: true });
    setValue("writtenTestRatio", 100 - value, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    // client-side validation for class-group when enabled
    setCgErrors({});
    if (showClassGroup) {
      const errors: { name?: string; period?: string; schedules?: string } = {};
      if (!cgName.trim()) errors.name = "학반명을 입력해주세요.";
      const periodNum = parseInt(cgPeriod, 10) || 0;
      if (!periodNum || periodNum < 1) errors.period = "차시(교시 수)를 올바르게 입력하세요.";
      const incomplete = cgSchedules.slice(0, periodNum).some((s) => !s.day || !s.period);
      if (periodNum > 0 && incomplete) errors.schedules = "모든 차시의 요일과 교시를 입력해주세요.";
      if (Object.keys(errors).length > 0) {
        setCgErrors(errors);
        showToast("학반 정보를 확인하세요.", "error");
        return;
      }
    }

    try {
      const payload = {
        ...values,
        instructor: instructorName,
        courseType,
      };
      if (isAfterSchool) {
        (payload as any).grade = (values as any).grade ?? "";
      }

      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "수업 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      if (responseBody?.class) {
        onCreated?.(responseBody.class);
      }

      showToast("수업이 생성되었습니다.", "success");
      // If user enabled class-group creation, attempt sequential create
      if (showClassGroup) {
        const periodNum = parseInt(cgPeriod, 10) || 0;
        const incomplete = cgSchedules.slice(0, periodNum).some((s) => !s.day || !s.period);
        if (!cgName.trim() || periodNum < 1 || incomplete) {
          showToast("수업은 생성되었으나, 학반 정보가 불완전합니다. 학반 정보를 확인해 주세요.", "warning");
        } else {
          try {
            const courseId = responseBody.class.id;
            const cgRes = await fetch(`/api/courses/${courseId}/class-groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: cgName.trim(),
                period: cgPeriod.trim() || null,
                schedules: cgSchedules.slice(0, periodNum).filter((s) => s.day && s.period),
                studentIds: [], // no students selected in combined flow
              }),
            });
            if (!cgRes.ok) {
              showToast("수업은 생성되었으나 학반 정보 등록에 실패했습니다. 수동으로 등록해 주세요.", "warning");
            } else {
              showToast("학반이 함께 생성되었습니다.", "success");
            }
          } catch (err) {
            console.error("class-group create error:", err);
            showToast("수업은 생성되었으나 학반 정보 등록에 실패했습니다. 수동으로 등록해 주세요.", "warning");
          }
        }
      }

      reset({
        academicYear: "",
        semester: "",
        subjectGroup: "-",
        subjectArea: "-",
        careerTrack: "-",
        subject: "",
        grade: "",
        classroom: "",
        description: "",
        writtenTestRatio: 60,
        performanceTestRatio: 40,
      });
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "수업 생성 중 오류가 발생했습니다.";
      showToast(message, "error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6"
      noValidate
    >
      {/* Ensure hidden fields exist for after-school mode even if UI is simplified */}
      {isAfterSchool && (
        <>
          <input type="hidden" {...register("careerTrack")} />
          <input type="hidden" {...register("subjectGroup")} />
          <input type="hidden" {...register("subjectArea")} />
          <input type="hidden" {...register("grade")} />
          <input type="hidden" {...register("writtenTestRatio")} />
          <input type="hidden" {...register("performanceTestRatio")} />
        </>
      )}
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
          aria-required="true"
        />
      </div>

      {!isAfterSchool && (
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
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              과목명 <span className="text-red-500">*</span>
            </label>
            {!isAfterSchool && (
              <label className="inline-flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={useRevisedCurriculum}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseRevisedCurriculum(checked);
                    if (checked) {
                      // enable selection mode: clear subject to force selection
                      setValue("subject", "", { shouldValidate: false });
                      // set placeholder markers
                      setValue("careerTrack", "-", { shouldValidate: false });
                      setValue("subjectGroup", "-", { shouldValidate: false });
                      setValue("subjectArea", "-", { shouldValidate: false });
                    } else {
                      // free-text mode: set meta fields to "-" and keep subject as is (user may type)
                      setValue("careerTrack", "-", { shouldValidate: false });
                      setValue("subjectGroup", "-", { shouldValidate: false });
                      setValue("subjectArea", "-", { shouldValidate: false });
                    }
                  }}
                />
                2022 개정 교육과정
              </label>
            )}
          </div>
          <div className="mt-2">
            {!isAfterSchool && useRevisedCurriculum ? (
              <Select
                {...register("subject")}
                options={subjectOptions}
                error={errors.subject?.message}
                aria-required="true"
              />
            ) : (
              <Input
                {...register("subject")}
                placeholder={isAfterSchool ? "강좌명을 입력하세요" : "과목명을 직접 입력하세요"}
                error={errors.subject?.message}
                aria-required="true"
              />
            )}
          </div>
        </div>
        <Input
          value={instructorName}
          label="강사명"
          readOnly
          aria-readonly="true"
          tabIndex={-1}
        />
      </div>

      <div className={`grid gap-6 ${isAfterSchool ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        <Input
          {...register("classroom")}
          label="강의실"
          placeholder="예: 본관 3층 305호"
          error={errors.classroom?.message}
        />
        {!isAfterSchool && (
          <Select
            {...register("grade")}
            label="대상 학년"
            options={gradeOptions}
            error={errors.grade?.message}
            aria-required="true"
          />
        )}
      </div>

      {!isAfterSchool && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                평가 비율 설정
              </label>
            </div>
            <div className="space-y-4 pt-2">
                {/* 지필평가 슬라이더 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[70px]">
                    지필평가
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={writtenTestRatio}
                    onChange={(e) =>
                      handleWrittenTestChange(Number(e.target.value))
                    }
                    className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer range-input range-input-blue"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${writtenTestRatio}%, #e5e7eb ${writtenTestRatio}%, #e5e7eb 100%)`,
                    }}
                  />
                  <span className="text-sm font-semibold text-blue-600 min-w-[45px] text-right">
                    {writtenTestRatio}%
                  </span>
                </div>

                {/* 수행평가 슬라이더 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[70px]">
                    수행평가
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={performanceTestRatio}
                    onChange={(e) =>
                      handlePerformanceTestChange(Number(e.target.value))
                    }
                    className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer range-input range-input-green"
                    style={{
                      background: `linear-gradient(to right, #16a34a 0%, #16a34a ${performanceTestRatio}%, #e5e7eb ${performanceTestRatio}%, #e5e7eb 100%)`,
                    }}
                  />
                  <span className="text-sm font-semibold text-green-600 min-w-[45px] text-right">
                    {performanceTestRatio}%
                  </span>
                </div>

                {/* 합계 표시 */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">합계</span>
                  <span
                    className={`text-sm font-semibold ${
                      writtenTestRatio + performanceTestRatio === 100
                        ? "text-gray-900"
                        : "text-red-600"
                    }`}
                  >
                    {writtenTestRatio + performanceTestRatio}%
                  </span>
                </div>

              {/* 안내 문구 */}
              <p className="text-xs text-gray-500 text-right mt-1">
                * 평가 세부 항목 비율 및 평가 방법은 수업 생성 후 설정 가능
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Optional class-group section */}
      <div className="border-t pt-4">
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">학반명 <span className="text-red-500">*</span></label>
            <Input value={cgName} onChange={(e) => setCgName(e.target.value)} placeholder="예: 1반" />
            {cgErrors.name && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">차시(교시 수) <span className="text-red-500">*</span></label>
              <Input value={cgPeriod} onChange={(e) => handleCgPeriodChange(e.target.value)} />
              {cgErrors.period && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.period}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">스케줄 <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {cgSchedules.map((s, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select
                      options={cgDaysOfWeek}
                      value={s.day}
                      onChange={(e) => handleCgScheduleChange(idx, "day", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      options={[{ value: "", label: "교시 선택" }, ...cgPeriodsOptions]}
                      value={s.period}
                      onChange={(e) => handleCgScheduleChange(idx, "period", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              {cgErrors.schedules && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.schedules}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setUseRevisedCurriculum(false);
            reset({
              academicYear: "",
              semester: "",
              subjectGroup: "-",
              subjectArea: "-",
              careerTrack: "-",
              subject: "",
              grade: "",
              classroom: "",
              description: "",
              writtenTestRatio: 60,
              performanceTestRatio: 40,
            });
          }}
        >
          초기화
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          수업 생성하기
        </Button>
      </div>
    </form>
  );
}

