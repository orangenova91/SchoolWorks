"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

const formSchema = z.object({
  classLabel: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

type UpdateHomeroomFormProps = {
  initialClassLabel?: string | null;
  onSuccess?: () => void;
  onUpdated?: () => void;
  onCancel?: () => void;
};

export default function UpdateHomeroomForm({
  initialClassLabel,
  onSuccess,
  onUpdated,
  onCancel,
}: UpdateHomeroomFormProps) {
  const { showToast } = useToastContext();
  const [classLabels, setClassLabels] = useState<string[]>([]);
  
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classLabel: initialClassLabel || "",
    },
  });

  // 학반 목록 가져오기
  useEffect(() => {
    const fetchClassLabels = async () => {
      try {
        const response = await fetch("/api/user/class-labels");
        if (!response.ok) {
          throw new Error("학반 목록을 불러오는데 실패했습니다.");
        }
        const data = await response.json();
        setClassLabels(data.classLabels || []);
        // 학반 목록이 로드된 후에 현재 값 설정
        if (initialClassLabel) {
          setValue("classLabel", initialClassLabel);
        }
      } catch (err) {
        console.error("Failed to fetch class labels:", err);
        // 에러가 발생해도 계속 진행 (빈 배열로 설정)
        setClassLabels([]);
      }
    };

    fetchClassLabels();
  }, [initialClassLabel, setValue]);

  // initialClassLabel이 변경될 때 form 값 업데이트
  useEffect(() => {
    if (initialClassLabel !== undefined) {
      setValue("classLabel", initialClassLabel || "");
    }
  }, [initialClassLabel, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      // 빈 값이면 null로 변환, 아니면 trim된 값 사용
      const classLabelValue = values.classLabel?.trim() === "" ? null : values.classLabel?.trim() || null;
      
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classLabel: classLabelValue,
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseBody?.error ??
          "담당 반 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        throw new Error(errorMessage);
      }

      showToast("담당 반이 수정되었습니다.", "success");
      onUpdated?.();
      onSuccess?.();
    } catch (error) {
      console.error("Update homeroom error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "담당 반 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      showToast(errorMessage, "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Controller
            name="classLabel"
            control={control}
            render={({ field }) => (
              <Select
                id="classLabel"
                label="학반"
                options={[
                  { value: "", label: "선택하세요" },
                  ...classLabels.map((label) => ({
                    value: label,
                    label: label,
                  })),
                ]}
                {...field}
                value={field.value || ""}
                error={errors.classLabel?.message}
              />
            )}
          />
          {classLabels.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              학반 목록을 불러오는 중...
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset({
              classLabel: initialClassLabel || "",
            });
            onCancel?.();
          }}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}

