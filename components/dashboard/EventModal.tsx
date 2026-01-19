"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import type { CalendarEvent as CalendarViewEvent } from "./CalendarView";

const PERIOD_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const GRADE_VALUES = ["1", "2", "3"] as const;
type PeriodValue = (typeof PERIOD_VALUES)[number];
type GradeValue = (typeof GRADE_VALUES)[number];

const eventFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  description: z.string().trim().max(1000, "설명은 1000자 이하여야 합니다").optional(),
  startDate: z.string().min(1, "시작 날짜를 입력하세요"),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  eventType: z.preprocess(
    (val) => val === "" ? undefined : val,
    z.enum(["자율*자치", "동아리", "진로", "봉사", "학사행사", "개인 일정", "기타 행사"]).optional()
  ),
  scope: z.enum(["school", "personal"]).default("school"),
  allDay: z.boolean().default(true),
  department: z.string().trim().max(100, "담당 부서는 100자 이하여야 합니다").optional(),
  responsiblePerson: z.string().trim().max(100, "담당자는 100자 이하여야 합니다").optional(),
  scheduleArea: z.enum(["창의적 체험활동", "교과", "기타", "개인일정(나만 보기)"], {
    required_error: "일정 영역을 선택하세요",
  }).optional(),
  gradeLevels: z.array(z.enum(GRADE_VALUES)).optional(),
  periods: z.array(z.enum(PERIOD_VALUES)).optional(),
}).superRefine((data, ctx) => {
  // 일정 구분이 '교과'가 아닐 때만 일정 유형을 필수로 검증
  if (data.scheduleArea !== "교과" && !data.eventType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "일정 유형을 선택하세요",
      path: ["eventType"],
    });
  }
});

type EventFormValues = z.infer<typeof eventFormSchema>;

type CalendarEvent = CalendarViewEvent & {
  extendedProps: CalendarViewEvent["extendedProps"] & {
    scheduleArea?: string;
  };
};

type EventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  selectedDate?: Date | null;
  selectedEndDate?: Date | null;
  onSaved: () => void;
  onDeleted?: () => void;
  allowedScheduleAreas?: string[];
  editableScopes?: string[];
};

export default function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  selectedEndDate,
  onSaved,
  onDeleted,
  allowedScheduleAreas,
  editableScopes,
}: EventModalProps) {
  const { showToast } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      eventType: "" as any,
      scope: "school" as any,
      allDay: true,
      department: "",
      responsiblePerson: "",
      scheduleArea: "" as any,
      gradeLevels: [] as GradeValue[],
      periods: [] as PeriodValue[],
    },
  });

  const allDay = watch("allDay");
  const scope = watch("scope");
  const scheduleArea = watch("scheduleArea");
  const hasScheduleArea = Boolean(scheduleArea);
  const isReadOnlyEvent = Boolean(
    event && editableScopes?.length && !editableScopes.includes(event.extendedProps.scope)
  );

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 이벤트가 있으면 수정 모드로 폼 채우기
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start);
      const endDate = event.end ? new Date(event.end) : null;

      // 로컬 날짜를 사용하여 타임존 문제 방지
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      reset({
        title: event.title,
        description: event.description || "",
        startDate: formatLocalDate(startDate),
        startTime: event.allDay ? "" : startDate.toTimeString().slice(0, 5),
        endDate: endDate ? formatLocalDate(endDate) : "",
        endTime: endDate && !event.allDay ? endDate.toTimeString().slice(0, 5) : "",
        eventType: event.extendedProps.eventType as any,
        scope: event.extendedProps.scope as any,
        allDay: event.allDay,
        department: event.extendedProps.department || "",
        responsiblePerson: event.extendedProps.responsiblePerson || "",
        scheduleArea: event.extendedProps.scheduleArea as any,
        gradeLevels: (event.extendedProps.gradeLevels || []) as GradeValue[],
        periods: (event.extendedProps.periods || []) as PeriodValue[],
      });
    } else if (selectedDate) {
      // 새 일정인 경우 선택된 날짜로 초기화
      // 로컬 날짜를 사용하여 타임존 문제 방지
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatLocalDate(selectedDate);
      const endDateStr = selectedEndDate ? formatLocalDate(selectedEndDate) : "";

      const defaultScheduleArea =
        allowedScheduleAreas?.length === 1 ? allowedScheduleAreas[0] : "";
      const defaultScope =
        defaultScheduleArea === "개인일정(나만 보기)" ? "personal" : "school";

      reset({
        title: "",
        description: "",
        startDate: startDateStr,
        startTime: "",
        endDate: endDateStr,
        endTime: "",
        eventType: "" as any,
        scope: defaultScope as any,
        allDay: true,
        department: "",
        responsiblePerson: "",
        scheduleArea: defaultScheduleArea as any,
        gradeLevels: [] as GradeValue[],
        periods: [] as PeriodValue[],
      });
    }
  }, [event, selectedDate, selectedEndDate, reset, allowedScheduleAreas]);

  // 종일 여부 변경 시 시간 필드 초기화
  useEffect(() => {
    if (allDay) {
      setValue("startTime", "");
      setValue("endTime", "");
    }
  }, [allDay, setValue]);

  // 일정 구분에 따라 eventType 자동 설정
  useEffect(() => {
    if (scheduleArea === "교과") {
      setValue("eventType", "학사행사" as any);
    } else if (scheduleArea === "개인일정(나만 보기)") {
      setValue("eventType", "개인 일정" as any);
    } else if (scheduleArea === "기타") {
      setValue("eventType", "기타 행사" as any);
    }
  }, [scheduleArea, setValue]);

  const onSubmit = async (values: EventFormValues) => {
    if (isReadOnlyEvent) {
      showToast("학교 일정은 수정할 수 없습니다.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      // 날짜/시간 결합
      const startDateTime = allDay
        ? new Date(values.startDate + "T00:00:00").toISOString()
        : new Date(values.startDate + "T" + (values.startTime || "00:00") + ":00").toISOString();

      const endDateTime = values.endDate
        ? allDay
          ? new Date(values.endDate + "T23:59:59").toISOString()
          : new Date(
              values.endDate + "T" + (values.endTime || "23:59") + ":59"
            ).toISOString()
        : null;

      const payload = {
        title: values.title,
        description: values.description || undefined,
        startDate: startDateTime,
        endDate: endDateTime ?? undefined,
        eventType: values.eventType || undefined,
        scope: values.scheduleArea === "개인일정(나만 보기)" ? "personal" : values.scope,
        allDay,
        department: values.department || undefined,
        responsiblePerson: values.responsiblePerson || undefined,
        scheduleArea: values.scheduleArea || undefined,
        gradeLevels: values.gradeLevels ?? [],
        periods: values.periods ?? [],
      };

      const url = event ? `/api/calendar-events/${event.id}` : "/api/calendar-events";
      const method = event ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "일정 저장 중 오류가 발생했습니다.");
      }

      onSaved();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "일정 저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("정말 이 일정을 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "일정 삭제 중 오류가 발생했습니다.");
      }

      onDeleted?.();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "일정 삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const allEventTypeOptions = [
    { value: "자율*자치", label: "자율*자치" },
    { value: "동아리", label: "동아리" },
    { value: "진로", label: "진로" },
    { value: "봉사", label: "봉사" },
    { value: "학사행사", label: "학사행사" },
    { value: "개인 일정", label: "개인 일정" },
    { value: "기타 행사", label: "기타 행사" },
  ];

  // 일정 구분이 '창의적 체험활동'일 때는 '학사행사'와 '개인 일정', "기타 행사" 옵션 제외
  const eventTypeOptions = scheduleArea === "창의적 체험활동"
    ? allEventTypeOptions.filter(
        (option) => option.value !== "학사행사" && option.value !== "개인 일정" && option.value !== "기타 행사"
      )
    : allEventTypeOptions;

  const scopeOptions = [
    { value: "personal", label: "개인 일정" },
    { value: "school", label: "학교 일정" },
  ];

  const scheduleAreaOptions = [
    { value: "창의적 체험활동", label: "창의적 체험활동" },
    { value: "교과", label: "교과" },
    { value: "기타", label: "기타" },
    { value: "개인일정(나만 보기)", label: "개인일정(나만 보기)" },
  ];

  const filteredScheduleAreaOptions =
    !event && allowedScheduleAreas?.length
      ? scheduleAreaOptions.filter((option) =>
          allowedScheduleAreas.includes(option.value)
        )
      : scheduleAreaOptions;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? "일정 수정" : "일정 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <Input
            {...register("title")}
            label="제목"
            placeholder="일정 제목을 입력하세요"
            error={errors.title?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              {...register("scheduleArea")}
              label="일정 구분"
              options={filteredScheduleAreaOptions}
              error={errors.scheduleArea?.message}
              placeholder="선택"
              disabled={isReadOnlyEvent}
            />
            <Select
              {...register("eventType")}
              label="일정 유형"
              options={eventTypeOptions}
              error={errors.eventType?.message}
              required={scheduleArea !== "교과" && hasScheduleArea}
              placeholder="선택"
              disabled={
                isReadOnlyEvent ||
                !hasScheduleArea ||
                scheduleArea === "교과" ||
                scheduleArea === "개인일정(나만 보기)" ||
                scheduleArea === "기타"
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("department")}
              label="담당 부서"
              placeholder="예: 교무부, 학생부 등"
              error={errors.department?.message}
              disabled={isReadOnlyEvent}
            />
            <Input
              {...register("responsiblePerson")}
              label="담당자"
              placeholder="담당자 이름을 입력하세요"
              error={errors.responsiblePerson?.message}
              disabled={isReadOnlyEvent}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="w-full md:w-1/3 lg:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-2">학년</label>
              <div className="flex flex-wrap gap-3">
                {GRADE_VALUES.map((grade) => (
                  <label key={grade} className="flex flex-col items-center text-sm text-gray-700">
                    <span className="mb-1">{grade}학년</span>
                    <input
                      type="checkbox"
                      value={grade}
                      {...register("gradeLevels")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isReadOnlyEvent}
                    />
                  </label>
                ))}
              </div>
              {errors.gradeLevels && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.gradeLevels.message as string}
                </p>
              )}
            </div>

            <div className="w-full md:flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                교시
              </label>
              <div className="flex flex-wrap gap-3">
                {PERIOD_VALUES.map((period) => (
                  <label key={period} className="flex flex-col items-center text-sm text-gray-700">
                    <span className="mb-1">{period}교시</span>
                    <input
                      type="checkbox"
                      value={period}
                      {...register("periods")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isReadOnlyEvent}
                    />
                  </label>
                ))}
              </div>
              {errors.periods && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.periods.message as string}
                </p>
              )}
            </div>

            
          </div>

          <div>
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                {...register("allDay")}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isReadOnlyEvent}
              />
              <span className="text-sm font-medium text-gray-700">종일</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register("startDate")}
                label="시작 날짜"
                type="date"
                error={errors.startDate?.message}
                required
                disabled={isReadOnlyEvent}
              />
              {!allDay && (
                <Input
                  {...register("startTime")}
                  label="시작 시간"
                  type="time"
                  error={errors.startTime?.message}
                  className="mt-2"
                  disabled={isReadOnlyEvent}
                />
              )}
            </div>
            <div>
              <Input
                {...register("endDate")}
                label="종료 날짜 (선택)"
                type="date"
                error={errors.endDate?.message}
                disabled={isReadOnlyEvent}
              />
              {!allDay && (
                <Input
                  {...register("endTime")}
                  label="종료 시간"
                  type="time"
                  error={errors.endTime?.message}
                  className="mt-2"
                  disabled={isReadOnlyEvent}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="일정에 대한 설명을 입력하세요"
              disabled={isReadOnlyEvent}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {event && onDeleted && !isReadOnlyEvent && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                삭제
              </Button>
            )}
            <div className="flex gap-3 ml-auto items-center">
              {isReadOnlyEvent && (
                <span className="text-sm text-gray-500 mr-2">
                  학교 일정은 수정/삭제할 수 없습니다.
                </span>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              {!isReadOnlyEvent && (
                <Button type="submit" isLoading={isSubmitting}>
                  {event ? "수정" : "추가"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

