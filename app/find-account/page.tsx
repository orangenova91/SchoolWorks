"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findAccountSchema, type FindAccountInput } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

const t = getTranslations("ko");

export default function FindAccountPage() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FindAccountInput>({
    resolver: zodResolver(findAccountSchema),
    defaultValues: {
      role: "student",
    },
  });

  const selectedRole = watch("role");
  const studentNumber = watch("studentNumber");

  // 역할이 교직원으로 변경될 때 학번 필드 초기화 및 검증
  useEffect(() => {
    if (selectedRole === "staff" && studentNumber && studentNumber.trim().length > 0) {
      setValue("studentNumber", "");
      trigger("studentNumber");
    }
  }, [selectedRole, studentNumber, setValue, trigger]);

  const onSubmit = async (data: FindAccountInput) => {
    setIsLoading(true);
    setFoundEmail(null);
    try {
      // 교직원인 경우 studentNumber를 제거
      const requestData = { ...data };
      if (requestData.role === "staff") {
        delete requestData.studentNumber;
      }

      const response = await fetch("/api/auth/find-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || t.messages.accountNotFound, "error");
        return;
      }

      if (result.email) {
        setFoundEmail(result.email);
        showToast(t.messages.accountFound, "success");
      } else {
        showToast(t.messages.accountNotFound, "error");
      }
    } catch (error) {
      showToast(t.messages.accountNotFound, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <AnimatedBackground />

      <div className="max-w-md w-full relative z-10">
        {/* 카드 스타일 컨테이너 */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20">
          {/* 헤더 영역 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              {t.auth.findAccountTitle}
            </h1>
            <p className="text-gray-600 text-base">
              {t.auth.findAccountDescription}
            </p>
          </div>

          {/* 계정 찾기 결과 표시 */}
          {foundEmail && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-2">
                {t.messages.accountFound}
              </p>
              <p className="text-sm text-gray-700">
                {t.messages.accountFoundMessage}:{" "}
                <span className="font-semibold text-green-700">{foundEmail}</span>
              </p>
            </div>
          )}

          {/* 폼 영역 */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              <Select
                {...register("role")}
                label={t.auth.selectRole}
                error={errors.role?.message}
                options={[
                  { value: "staff", label: t.auth.roleStaff },
                  { value: "student", label: t.auth.roleStudent },
                  { value: "parent", label: t.auth.roleParent },
                ]}
                placeholder={t.auth.selectRole}
                aria-required="true"
                className="transition-all duration-200"
              />
              <Input
                {...register("school")}
                type="text"
                label={t.auth.school}
                error={errors.school?.message}
                autoComplete="organization"
                aria-required="true"
                className="transition-all duration-200"
              />
              <Input
                {...register("studentNumber")}
                type="text"
                label={
                  selectedRole === "parent"
                    ? t.auth.childStudentNumber
                    : t.auth.studentNumber
                }
                error={errors.studentNumber?.message}
                autoComplete="off"
                aria-required={selectedRole !== "staff"}
                disabled={selectedRole === "staff"}
                className="transition-all duration-200"
              />
              <Input
                {...register("name")}
                type="text"
                label={
                  selectedRole === "parent"
                    ? t.auth.childName
                    : t.auth.name
                }
                error={errors.name?.message}
                autoComplete="name"
                aria-required="true"
                className="transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              isLoading={isLoading}
              disabled={isLoading}
              size="lg"
            >
              {t.auth.findAccount}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
              >
                {t.auth.backToLogin}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

