"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

const optionSchema = z.object({
  text: z.string().trim().min(1, "보기 내용을 입력하세요"),
});

const singleQuestionSchema = z
  .object({
    questionType: z.enum(["객관식", "서술형"], {
      required_error: "문제 유형을 선택하세요",
    }),
    questionText: z
      .string()
      .trim()
      .min(1, "문제 지문을 입력하세요")
      .max(2000, "문제 지문은 2000자 이하여야 합니다"),
    imageUrl: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length === 0 ? undefined : value,
      z.string().url("이미지 URL 형식이 올바르지 않습니다.").optional()
    ),
    points: z
      .number()
      .min(1, "배점은 1점 이상이어야 합니다")
      .max(100, "배점은 100점 이하여야 합니다"),
    options: z.array(optionSchema).optional(),
    correctAnswer: z.number().optional(),
    modelAnswer: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.questionType === "객관식") {
        return (
          data.options &&
          data.options.length >= 2 &&
          data.options.length <= 10 &&
          data.correctAnswer !== undefined &&
          data.correctAnswer >= 0
        );
      }
      return true;
    },
    {
      message: "객관식 문항은 최소 2개의 보기와 정답이 필요합니다",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      if (data.questionType === "서술형") {
        return (
          data.modelAnswer &&
          data.modelAnswer.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "서술형 문항은 모범답안을 입력해야 합니다",
      path: ["modelAnswer"],
    }
  );

const questionsSchema = z.object({
  unit: z
    .string()
    .trim()
    .min(1, "평가 단원을 입력하세요")
    .max(100, "평가 단원은 100자 이하여야 합니다"),
  evaluationContent: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z
      .string()
      .trim()
      .max(2000, "평가 내용은 2000자 이하여야 합니다")
      .optional()
  ),
  questionNumber: z
    .string()
    .trim()
    .max(50, "문제 비밀번호는 50자 이하여야 합니다")
    .optional()
    .default(""),
  questions: z.array(singleQuestionSchema).min(1, "최소 1개의 문항이 필요합니다"),
});

type QuestionsFormValues = z.infer<typeof questionsSchema>;

interface EvaluationQuestionInitialData {
  unit: string;
  evaluationContent?: string;
  questionNumber: string;
  questions: Array<{
    questionType: "객관식" | "서술형";
    questionText: string;
    imageUrl?: string;
    points: number;
    options?: Array<{ text: string }>;
    correctAnswer?: number;
    modelAnswer?: string;
  }>;
}

interface EvaluationQuestionFormProps {
  courseId: string;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  initialData?: EvaluationQuestionInitialData;
  evaluationQuestionId?: string;
}

const getEmptyFormValues = (): QuestionsFormValues => ({
  unit: "",
  evaluationContent: "",
  questionNumber: "",
  questions: [
    {
      questionType: "객관식",
      questionText: "",
      imageUrl: undefined,
      points: 1,
      options: [{ text: "" }, { text: "" }],
      correctAnswer: -1,
    },
  ],
});

const mapInitialDataToFormValues = (
  initialData: EvaluationQuestionInitialData
): QuestionsFormValues => ({
  unit: initialData.unit,
  evaluationContent: initialData.evaluationContent ?? "",
  questionNumber: initialData.questionNumber,
  questions: initialData.questions.map((question) => {
    if (question.questionType === "객관식") {
      const safeOptions =
        question.options && question.options.length >= 2
          ? question.options
          : [{ text: "" }, { text: "" }];
      return {
        questionType: "객관식" as const,
        questionText: question.questionText,
        imageUrl: question.imageUrl,
        points: question.points,
        options: safeOptions,
        correctAnswer:
          typeof question.correctAnswer === "number" ? question.correctAnswer : -1,
      };
    }

    return {
      questionType: "서술형" as const,
      questionText: question.questionText,
      imageUrl: question.imageUrl,
      points: question.points,
      modelAnswer: question.modelAnswer ?? "",
    };
  }),
});

export default function EvaluationQuestionForm({
  courseId,
  onSuccess,
  mode = "create",
  initialData,
  evaluationQuestionId,
}: EvaluationQuestionFormProps) {
  const { showToast } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingQuestionIndex, setUploadingQuestionIndex] = useState<number | null>(null);
  const isEditMode = mode === "edit" && !!evaluationQuestionId;
  const [requirePassword, setRequirePassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<QuestionsFormValues>({
    resolver: zodResolver(questionsSchema),
    defaultValues: getEmptyFormValues(),
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: "questions",
  });

  const watchedQuestions = watch("questions");

  useEffect(() => {
    if (isEditMode && initialData) {
      reset(mapInitialDataToFormValues(initialData));
    } else if (!isEditMode) {
      reset(getEmptyFormValues());
    }
    // show/hide password input based on initialData
    if (initialData && initialData.questionNumber && initialData.questionNumber.trim()) {
      setRequirePassword(true);
    } else {
      setRequirePassword(false);
    }
  }, [isEditMode, initialData, reset]);

  const addQuestion = () => {
    appendQuestion({
      questionType: "객관식" as const,
      questionText: "",
      imageUrl: undefined,
      points: 1,
      options: [{ text: "" }, { text: "" }],
      correctAnswer: -1,
    });
  };

  const removeQuestionHandler = (index: number) => {
    if (questionFields.length > 1) {
      removeQuestion(index);
    } else {
      showToast("최소 1개의 문항이 필요합니다.", "error");
    }
  };

  const uploadQuestionImage = async (questionIndex: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 업로드할 수 있습니다.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("이미지 크기는 5MB 이하여야 합니다.", "error");
      return;
    }

    try {
      setUploadingQuestionIndex(questionIndex);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/announcements/images", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "이미지 업로드 중 오류가 발생했습니다.");
      }

      setValue(`questions.${questionIndex}.imageUrl`, data.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      showToast("이미지가 업로드되었습니다.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setUploadingQuestionIndex(null);
    }
  };

  const removeQuestionImage = (questionIndex: number) => {
    setValue(`questions.${questionIndex}.imageUrl`, undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: QuestionsFormValues) => {
    try {
      setIsSubmitting(true);

      // 객관식 문항에 대해 로컬 검증: 정답이 선택되지 않았다면 즉시 에러 표시
      const incompleteQuestions = values.questions
        .map((question, index) => ({ question, index }))
        .filter(
          ({ question }) =>
            question.questionType === "객관식" &&
            (question.correctAnswer === undefined || question.correctAnswer < 0)
        );

      if (incompleteQuestions.length > 0) {
        const questionNumbers = incompleteQuestions
          .map(({ index }) => `문항 ${index + 1}`)
          .join(", ");

        showToast(
          `${questionNumbers}의 객관식 정답을 선택해주세요.`,
          "error"
        );
        return;
      }

      const endpoint = isEditMode
        ? `/api/courses/${courseId}/evaluation-questions/${evaluationQuestionId}`
        : `/api/courses/${courseId}/evaluation-questions`;

      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch (parseError) {
        console.warn("평가 문항 생성 응답 파싱 실패:", parseError);
      }

      if (!response.ok) {
        let errorMessage = "평가 문항 생성 중 오류가 발생했습니다.";

        if (
          responseBody &&
          typeof responseBody === "object" &&
          "error" in responseBody &&
          typeof (responseBody as { error?: unknown }).error === "string"
        ) {
          errorMessage = (responseBody as { error: string }).error;
        }

        if (
          responseBody &&
          typeof responseBody === "object" &&
          "details" in responseBody
        ) {
          const details = (responseBody as { details?: unknown }).details;
          if (typeof details === "string" && details.trim().length > 0) {
            errorMessage = details;
          } else if (Array.isArray(details)) {
            const detailMessages = details
              .map((detail) => {
                if (
                  detail &&
                  typeof detail === "object" &&
                  "message" in detail &&
                  typeof (detail as { message?: unknown }).message === "string"
                ) {
                  return (detail as { message: string }).message;
                }
                return typeof detail === "string" ? detail : null;
              })
              .filter((msg): msg is string => !!msg && msg.trim().length > 0);

            if (detailMessages.length > 0) {
              errorMessage = detailMessages.join("\n");
            }
          }
        }

        throw new Error(errorMessage);
      }

      showToast(
        isEditMode
          ? "평가 문항이 수정되었습니다."
          : `${values.questions.length}개의 평가 문항이 생성되었습니다.`,
        "success"
      );

      if (isEditMode && initialData) {
        reset(mapInitialDataToFormValues(initialData));
      } else {
        reset(getEmptyFormValues());
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "평가 문항 생성 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
      {/* 평가 단원과 문제 비밀번호 - 상단에 한 번만 */}
      <div className="grid gap-y-4 gap-x-6 sm:grid-cols-2">
        <div className="space-y-4">
          
          <Input
            {...register("unit")}
            label="평가 단원"
            placeholder="예: 1단원 - 수와 연산"
            error={errors.unit?.message}
            aria-required="true"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="questionPasswordToggle"
              className="block text-sm font-medium text-gray-700"
            >
              문제 비밀번호 <span className="text-xs text-gray-400">(선택)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="questionPasswordToggle"
                type="checkbox"
                checked={requirePassword}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRequirePassword(checked);
                  if (!checked) {
                    setValue("questionNumber", "");
                  }
                }}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="questionPasswordToggle" className="text-sm text-gray-600">
                사용
              </label>
            </div>
          </div>

          {requirePassword ? (
            <Input
              {...register("questionNumber")}
              placeholder="예: 1234"
              error={errors.questionNumber?.message}
              aria-required="false"
            />
          ) : (
            <p className="text-xs text-gray-500">
              입력시 학생들은 비밀번호를 입력해야 평가에 임할수 있습니다.
            </p>
          )}
        </div>
      </div>

      {/* 평가 내용: 전체 가로 영역 차지 */}
      <div className="space-y-2">
        <label
          htmlFor="evaluationContent"
          className="block text-sm font-medium text-gray-700"
        >
          평가 내용 <span className="text-xs text-gray-400">(선택)</span>
        </label>
        <textarea
          {...register("evaluationContent")}
          id="evaluationContent"
          rows={2}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="예: 이번 평가는 1단원 핵심 개념과 계산력을 점검합니다."
        />
        {errors.evaluationContent?.message && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.evaluationContent.message}
          </p>
        )}
      </div>

      

      <div className="border-t border-gray-200"></div>

      {/* 문항들 - 문제 지문과 보기만 */}
      {questionFields.map((questionField, questionIndex) => {
        const questionType = watchedQuestions[questionIndex]?.questionType || "객관식";
        const questionOptions = watchedQuestions[questionIndex]?.options || [];
        const questionCorrectAnswer = watchedQuestions[questionIndex]?.correctAnswer ?? -1;
        const questionImageUrl = watchedQuestions[questionIndex]?.imageUrl;

        const addOption = () => {
          const currentOptions = getValues(`questions.${questionIndex}.options`) || [];
          if (currentOptions.length < 10) {
            setValue(`questions.${questionIndex}.options`, [
              ...currentOptions,
              { text: "" },
            ]);
          } else {
            showToast("최대 10개의 보기까지 추가할 수 있습니다.", "error");
          }
        };

        const removeOptionHandler = (optionIndex: number) => {
          const currentOptions = getValues(`questions.${questionIndex}.options`) || [];
          if (currentOptions.length > 2) {
            const newOptions = currentOptions.filter((_, idx) => idx !== optionIndex);
            setValue(`questions.${questionIndex}.options`, newOptions);
            // 정답 인덱스 조정
            if (questionCorrectAnswer === optionIndex) {
              setValue(`questions.${questionIndex}.correctAnswer`, -1);
            } else if (questionCorrectAnswer > optionIndex) {
              setValue(
                `questions.${questionIndex}.correctAnswer`,
                questionCorrectAnswer - 1
              );
            }
          } else {
            showToast("최소 2개의 보기가 필요합니다.", "error");
          }
        };

        return (
          <div
            key={questionField.id}
            className="space-y-6 p-6 border border-gray-200 rounded-xl bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">
                문항 {questionIndex + 1}
              </h4>
              {questionFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestionHandler(questionIndex)}
                  className="text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded px-2 py-1 text-sm font-medium"
                >
                  문항 삭제
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`questionText-${questionIndex}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  문제 지문 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`questionType-${questionIndex}`}
                      className="text-sm font-medium text-gray-700"
                    >
                      문제 유형:
                    </label>
                    <select
                      {...register(`questions.${questionIndex}.questionType`)}
                      id={`questionType-${questionIndex}`}
                    onChange={(e) => {
                      setValue(`questions.${questionIndex}.questionType`, e.target.value as "객관식" | "서술형");
                      // 서술형으로 변경하면 보기와 정답 초기화, 모범답안 초기화
                      if (e.target.value === "서술형") {
                        setValue(`questions.${questionIndex}.options`, undefined);
                        setValue(`questions.${questionIndex}.correctAnswer`, undefined);
                        setValue(`questions.${questionIndex}.modelAnswer`, "");
                      } else {
                        // 객관식으로 변경하면 기본 보기 추가, 모범답안 초기화
                        const currentOptions = getValues(`questions.${questionIndex}.options`);
                        if (!currentOptions || currentOptions.length === 0) {
                          setValue(`questions.${questionIndex}.options`, [{ text: "" }, { text: "" }]);
                          setValue(`questions.${questionIndex}.correctAnswer`, -1);
                        }
                        setValue(`questions.${questionIndex}.modelAnswer`, undefined);
                      }
                    }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <option value="객관식">객관식</option>
                      <option value="서술형">서술형</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`points-${questionIndex}`}
                      className="text-sm font-medium text-gray-700"
                    >
                      배점:
                    </label>
                    <input
                      {...register(`questions.${questionIndex}.points`, {
                        valueAsNumber: true,
                      })}
                      id={`points-${questionIndex}`}
                      type="number"
                      min="1"
                      max="100"
                      className="w-20 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      placeholder="점수"
                    />
                    <span className="text-sm text-gray-600">점</span>
                  </div>
                </div>
              </div>
              <textarea
                {...register(`questions.${questionIndex}.questionText`)}
                id={`questionText-${questionIndex}`}
                rows={4}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="문제 지문을 입력하세요..."
              />
              {errors.questions?.[questionIndex]?.questionText && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.questions[questionIndex]?.questionText?.message}
                </p>
              )}
              {errors.questions?.[questionIndex]?.questionType && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.questions[questionIndex]?.questionType?.message}
                </p>
              )}
              {errors.questions?.[questionIndex]?.points && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.questions[questionIndex]?.points?.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <input type="hidden" {...register(`questions.${questionIndex}.imageUrl`)} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">
                  문항 이미지 <span className="text-xs text-gray-400">(선택)</span>
                </span>
                {questionImageUrl && (
                  <button
                    type="button"
                    onClick={() => removeQuestionImage(questionIndex)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    이미지 삭제
                  </button>
                )}
              </div>
              <div
                className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-400 transition-colors hover:border-blue-400 hover:text-gray-600"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    uploadQuestionImage(questionIndex, file);
                  }
                }}
              >
                <label className="mb-1 inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                  <span>
                    {uploadingQuestionIndex === questionIndex ? "업로드 중..." : "이미지 업로드"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingQuestionIndex === questionIndex}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadQuestionImage(questionIndex, file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <p>이미지를 여기로 드래그 앤 드롭하세요.</p>
              </div>
              {questionImageUrl && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={questionImageUrl}
                    alt="문항 이미지 미리보기"
                    className="max-h-64 w-full rounded-md object-contain"
                  />
                </div>
              )}
            </div>

            {questionType === "객관식" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    객관식 보기 <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    className="text-xs"
                  >
                    + 보기 추가
                  </Button>
                </div>

                {questionOptions.map((option, optionIndex) => (
                <div key={`${questionIndex}-${optionIndex}`} className="flex items-start gap-3">
                  <div className="flex items-center pt-2">
                    <input
                      type="radio"
                      id={`correct-${questionIndex}-${optionIndex}`}
                      name={`correctAnswer-${questionIndex}`}
                      value={optionIndex}
                      checked={questionCorrectAnswer === optionIndex}
                      onChange={(e) =>
                        setValue(
                          `questions.${questionIndex}.correctAnswer`,
                          parseInt(e.target.value)
                        )
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label
                      htmlFor={`correct-${questionIndex}-${optionIndex}`}
                      className="ml-2 text-sm font-medium text-gray-700"
                    >
                      정답
                    </label>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 min-w-[2rem]">
                        {optionIndex + 1}번
                      </span>
                      <Input
                        {...register(
                          `questions.${questionIndex}.options.${optionIndex}.text`
                        )}
                        placeholder={`보기 ${optionIndex + 1} 내용을 입력하세요`}
                        error={
                          errors.questions?.[questionIndex]?.options?.[optionIndex]
                            ?.text?.message
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  {questionOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionHandler(optionIndex)}
                      className="mt-2 text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded p-1"
                      aria-label="보기 삭제"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {errors.questions?.[questionIndex]?.options &&
                typeof errors.questions[questionIndex]?.options === "object" &&
                "message" in errors.questions[questionIndex]?.options && (
                  <p className="text-sm text-red-600" role="alert">
                    {
                      (errors.questions[questionIndex]?.options as any)
                        ?.message as string
                    }
                  </p>
                )}
                {errors.questions?.[questionIndex]?.correctAnswer && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.questions[questionIndex]?.correctAnswer?.message}
                  </p>
                )}
              </div>
            )}

            {questionType === "서술형" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`modelAnswer-${questionIndex}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    모범답안 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register(`questions.${questionIndex}.modelAnswer`)}
                    id={`modelAnswer-${questionIndex}`}
                    rows={6}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="서술형 문제의 모범답안을 입력하세요..."
                    aria-required="true"
                  />
                  {errors.questions?.[questionIndex]?.modelAnswer && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.questions[questionIndex]?.modelAnswer?.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
        >
          + 문항 추가하기
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEditMode && initialData) {
                reset(mapInitialDataToFormValues(initialData));
              } else {
                reset(getEmptyFormValues());
              }
            }}
          >
            초기화
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditMode ? "평가 수정하기" : "평가 생성하기"}
          </Button>
        </div>
      </div>
    </form>
  );
}
