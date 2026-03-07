import { z } from "zod";

// 학생 프로필 수정 스키마
export const updateStudentProfileSchema = z.object({
  // User 필드
  name: z.string().min(1, "이름을 입력해주세요").max(50, "이름은 50자 이하여야 합니다").optional(),
  school: z.string().max(100, "학교명은 100자 이하여야 합니다").optional(),
  region: z.string().max(50, "지역은 50자 이하여야 합니다").optional().nullable(),
  
  // StudentProfile 필드
  studentId: z.string().max(50, "학번은 50자 이하여야 합니다").optional().nullable(),
  grade: z.string().max(10, "학년은 10자 이하여야 합니다").optional().nullable(),
  classLabel: z.string().max(50, "학반은 50자 이하여야 합니다").optional().nullable(),
  section: z.string().max(50, "구분은 50자 이하여야 합니다").optional().nullable(),
  seatNumber: z.string().max(10, "좌석번호는 10자 이하여야 합니다").optional().nullable(),
  major: z.string().max(100, "전공은 100자 이하여야 합니다").optional().nullable(),
  sex: z.string().max(10, "성별은 10자 이하여야 합니다").optional().nullable(),
  classOfficer: z.string().max(50, "학급직은 50자 이하여야 합니다").optional().nullable(),
  studentCouncilRole: z.string().max(50, "학생회 직위는 50자 이하여야 합니다").optional().nullable(),
  specialEducation: z.string().max(100, "특수교육은 100자 이하여야 합니다").optional().nullable(),
  phoneNumber: z.string().max(20, "전화번호는 20자 이하여야 합니다").optional().nullable(),
  siblings: z.string().max(100, "형제관계는 100자 이하여야 합니다").optional().nullable(),
  academicStatus: z.string().max(100, "학적상태는 100자 이하여야 합니다").optional().nullable(),
  remarks: z.string().max(500, "비고는 500자 이하여야 합니다").optional().nullable(),
  club: z.string().max(100, "동아리는 100자 이하여야 합니다").optional().nullable(),
  clubTeacher: z.string().max(50, "동아리 담당교사는 50자 이하여야 합니다").optional().nullable(),
  clubLocation: z.string().max(100, "동아리 장소는 100자 이하여야 합니다").optional().nullable(),
  dateOfBirth: z.string().max(20, "생년월일은 20자 이하여야 합니다").optional().nullable(),
  address: z.string().max(200, "주소는 200자 이하여야 합니다").optional().nullable(),
  residentRegistrationNumber: z.string().max(50, "주민등록번호는 50자 이하여야 합니다").optional().nullable(),
  motherName: z.string().max(50, "어머니 이름은 50자 이하여야 합니다").optional().nullable(),
  motherPhone: z.string().max(20, "어머니 전화번호는 20자 이하여야 합니다").optional().nullable(),
  motherRemarks: z.string().max(500, "어머니 비고는 500자 이하여야 합니다").optional().nullable(),
  fatherName: z.string().max(50, "아버지 이름은 50자 이하여야 합니다").optional().nullable(),
  fatherPhone: z.string().max(20, "아버지 전화번호는 20자 이하여야 합니다").optional().nullable(),
  fatherRemarks: z.string().max(500, "아버지 비고는 500자 이하여야 합니다").optional().nullable(),
  electiveSubjects: z.union([z.array(z.string()), z.string()]).optional(),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

