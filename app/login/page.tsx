"use client";

import { useState, MouseEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const t = getTranslations("ko");
const currentYear = new Date().getFullYear();
const ENABLE_SELF_REGISTRATION = false;

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);
  const [highlightGoogle, setHighlightGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPasswordClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    showToast("서비스 준비중입니다. 관리자에게 문의하세요.", "info");
  };

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "SOCIAL_ONLY_GOOGLE") {
          showToast(t.messages.socialLoginRequired, "error");
          setHighlightGoogle(true);
        } else {
          showToast(t.messages.loginError, "error");
        }
      } else {
        setHighlightGoogle(false);
        showToast(t.messages.loginSuccess, "success");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      showToast(t.messages.loginError, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setHighlightGoogle(false);
    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      showToast(t.messages.loginError, "error");
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          {/* 로그인 화면 이미지 */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <Image
                src="/logo/SchoolLogo.png"
                alt="SchoolHub Logo"
                width={48}
                height={48}
                className="object-contain"
              />
              <h1 className="text-4xl font-extrabold text-gray-900">
                {t.auth.login}<span className="text-sm font-normal"> {t.app.version}</span>
              </h1>
            </div>
            <p className="text-gray-600 text-base">
              SchoolHub에 오신 것을 환영합니다
            </p>
          </div>

          {/* 폼 영역 */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              <Input
                {...register("email")}
                type="email"
                label={t.auth.email}
                error={errors.email?.message}
                autoComplete="email"
                aria-required="true"
                className="transition-all duration-200"
              />
              <div className="relative">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  label={t.auth.password}
                  error={errors.password?.message}
                  autoComplete="current-password"
                  aria-required="true"
                  className="transition-all duration-200 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-[calc(50%+0.75rem)] -translate-y-1/2 text-gray-300 hover:text-gray-500 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="#"
                onClick={handleForgotPasswordClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              isLoading={isLoading}
              disabled={isLoading}
              size="lg"
            >
              {t.auth.login}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/80 text-gray-500">또는</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border flex items-center justify-center gap-3 ${
                highlightGoogle
                  ? "border-blue-500 ring-2 ring-blue-300 animate-pulse"
                  : "border-gray-300"
              }`}
              size="lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </Button>

            <div className="text-center space-y-2">
              {ENABLE_SELF_REGISTRATION && (
                <p className="text-sm text-gray-600">
                  {t.auth.dontHaveAccount}{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                  >
                    {t.auth.createAccount}
                  </Link>
                </p>
              )}
              <p className="text-sm text-gray-600">
                {t.auth.forgotAccount}{" "}
                <Link
                  href="/find-account"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                >
                  {t.auth.findAccount}
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* 하단 정보 */}
        <p className="mt-6 text-center text-xs text-gray-500">
          © {currentYear} SchoolHub. All rights reserved.
        </p>
      </div>
    </div>
  );
}

