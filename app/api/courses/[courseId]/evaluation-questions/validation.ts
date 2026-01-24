import { z } from "zod";

export const evaluationQuestionPayloadSchema = z.object({
  unit: z
    .string()
    .trim()
    .min(1, "평가 단원을 입력하세요")
    .max(100, "평가 단원은 100자 이하여야 합니다"),
  questionNumber: z
    .string()
    .trim()
    .max(50, "문제 주문번호는 50자 이하여야 합니다")
    .optional()
    .default(""),
  questions: z
    .array(
      z.object({
        questionType: z.enum(["객관식", "서술형"]),
        questionText: z
          .string()
          .trim()
          .min(1, "문제 지문을 입력하세요")
          .max(2000, "문제 지문은 2000자 이하여야 합니다"),
        imageUrl: z.preprocess(
          (value) =>
            typeof value === "string" && value.trim().length === 0
              ? undefined
              : value,
          z.string().url().optional()
        ),
        points: z
          .number()
          .min(1, "배점은 1점 이상이어야 합니다")
          .max(100, "배점은 100점 이하여야 합니다"),
        options: z
          .array(
            z.object({
              text: z.string().trim().min(1, "보기 내용을 입력하세요"),
            })
          )
          .optional(),
        correctAnswer: z.number().optional(),
        modelAnswer: z.string().optional(),
      })
    )
    .min(1, "최소 1개의 문항이 필요합니다"),
});

export type EvaluationQuestionPayload = z.infer<typeof evaluationQuestionPayloadSchema>;


