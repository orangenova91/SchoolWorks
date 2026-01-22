import { z } from "zod";

// 로그인 스키마
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("유효한 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

// 회원가입 스키마
export const registerSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요").max(50, "이름은 50자 이하여야 합니다"),
    email: z
      .string()
      .min(1, "이메일을 입력해주세요")
      .email("유효한 이메일 주소를 입력해주세요"),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
      .regex(
        /^(?=.*[a-z])(?=.*\d)/,
        "비밀번호는 소문자, 숫자를 포함해야 합니다"
      ),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
    school: z.string().min(1, "학교명을 입력해주세요").max(100, "학교명은 100자 이하여야 합니다"),
    role: z.enum(["student", "teacher"], {
      errorMap: () => ({ message: "역할을 선택해주세요" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

// 비밀번호 재설정 요청 스키마
export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("유효한 이메일 주소를 입력해주세요"),
});

// 비밀번호 재설정 스키마
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "토큰이 필요합니다"),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
      .regex(
        /^(?=.*[a-z])(?=.*\d)/,
        "비밀번호는 소문자, 숫자를 포함해야 합니다"
      ),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

// 이메일 인증 스키마
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "토큰이 필요합니다"),
});

// 계정 찾기 스키마
export const findAccountSchema = z
  .object({
    role: z.enum(["staff", "student", "parent"], {
      errorMap: () => ({ message: "역할을 선택해주세요" }),
    }),
    school: z.string().min(1, "학교명을 입력해주세요").max(100, "학교명은 100자 이하여야 합니다"),
    studentNumber: z.string().optional(),
    name: z.string().min(1, "이름을 입력해주세요").max(50, "이름은 50자 이하여야 합니다"),
  })
  .refine(
    (data) => {
      // 교직원(staff)인 경우 학번이 있으면 안됨
      if (data.role === "staff") {
        return !data.studentNumber || data.studentNumber.trim().length === 0;
      }
      // 학생 또는 학부모인 경우 학번 필수
      return data.studentNumber && data.studentNumber.trim().length > 0;
    },
    (data) => {
      if (data.role === "staff") {
        return {
          message: "학번을 지우세요",
          path: ["studentNumber"],
        };
      }
      return {
        message: "학번을 입력해주세요",
        path: ["studentNumber"],
      };
    }
  );

export type FindAccountInput = z.infer<typeof findAccountSchema>;

// 학년별 정보 스키마
export const gradeInfoSchema = z.object({
  grade: z.string().min(1, "학년을 입력해주세요"),
  classCount: z.number().int().min(1, "학급수는 1 이상이어야 합니다"),
  studentCount: z.number().int().min(0, "학생수는 0 이상이어야 합니다"),
});

// Admin 계정 생성 스키마 (슈퍼어드민용)
export const createAdminSchema = z.object({
  schoolName: z.string().min(1, "학교 이름을 입력해주세요").max(100, "학교 이름은 100자 이하여야 합니다"),
  schoolType: z
    .string()
    .min(1, "학교 구분을 선택해주세요")
    .refine(
      (val) => ["초등학교", "중학교", "고등학교", "대학교", "기타"].includes(val),
      {
        message: "학교 구분을 선택해주세요",
      }
    ),
  adminName: z.string().min(1, "담당자 이름을 입력해주세요").max(50, "담당자 이름은 50자 이하여야 합니다"),
  adminEmail: z
    .string()
    .min(1, "담당자 이메일을 입력해주세요")
    .email("유효한 이메일 주소를 입력해주세요"),
  adminPassword: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .regex(
      /^(?=.*[a-z])(?=.*\d)/,
      "비밀번호는 소문자, 숫자를 포함해야 합니다"
    ),
  contactName: z.string().min(1, "스쿨허브 담당자 이름을 입력해주세요").max(50),
  contactPhone: z.string().min(1, "담당자 전화번호를 입력해주세요").max(20),
  gradeInfo: z.array(gradeInfoSchema).min(1, "최소 1개 학년의 정보가 필요합니다"),
  notes: z.string().optional(),
});

// Admin 계정 수정 스키마 (슈퍼어드민용, 비밀번호는 선택사항)
export const updateAdminSchema = z.object({
  adminId: z.string().min(1, "Admin ID가 필요합니다"),
  schoolType: z
    .string()
    .min(1, "학교 구분을 선택해주세요")
    .refine(
      (val) => ["초등학교", "중학교", "고등학교", "대학교", "기타"].includes(val),
      {
        message: "학교 구분을 선택해주세요",
      }
    ),
  adminName: z.string().min(1, "담당자 이름을 입력해주세요").max(50, "담당자 이름은 50자 이하여야 합니다"),
  adminEmail: z
    .string()
    .min(1, "담당자 이메일을 입력해주세요")
    .email("유효한 이메일 주소를 입력해주세요"),
  adminPassword: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (val.length >= 8 && /^(?=.*[a-z])(?=.*\d)/.test(val)),
      {
        message: "비밀번호는 최소 8자 이상이며 소문자와 숫자를 포함해야 합니다",
      }
    ),
  schoolName: z.string().min(1, "학교 이름을 입력해주세요").max(100, "학교 이름은 100자 이하여야 합니다"),
  contactName: z.string().min(1, "스쿨허브 담당자 이름을 입력해주세요").max(50),
  contactPhone: z.string().min(1, "담당자 전화번호를 입력해주세요").max(20),
  gradeInfo: z.array(gradeInfoSchema).min(1, "최소 1개 학년의 정보가 필요합니다"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type GradeInfoInput = z.infer<typeof gradeInfoSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

