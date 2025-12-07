import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";
import { parse } from "csv-parse/sync";

export const dynamic = 'force-dynamic';

type CsvRow = {
  // User 필드 (수정 템플릿: 이메일만 필수)
  "(필수)이메일"?: string;
  "이름"?: string;
  "학교"?: string;
  "지역"?: string;
  "역할"?: string;
  "비밀번호"?: string;
  
  // StudentProfile 필드 (role이 "student"일 때)
  "학번"?: string;
  "전공교과"?: string;
  "성별"?: string;
  "학급임원"?: string;
  "특수교육대상여부"?: string;
  "연락처"?: string;
  "형제자매"?: string;
  "학적"?: string;
  "비고"?: string;
  "동아리"?: string;
  "동아리담당교사"?: string;
  "동아리활동장소"?: string;
  "생년월일"?: string;
  "주소"?: string;
  "주민등록번호"?: string;
  "어머니성함"?: string;
  "어머니연락처"?: string;
  "어머니관련비고"?: string;
  "아버지성함"?: string;
  "아버지연락처"?: string;
  "아버지관련비고"?: string;
  "선택과목"?: string; // CSV에서는 쉼표로 구분된 문자열
  
  // TeacherProfile 필드 (role이 "teacher"일 때)
  "직위"?: string;
};

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 파일 확인
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 제공되지 않았습니다." }, { status: 400 });
    }

    // CSV 파일 읽기
    const text = await file.text();
    let rows: CsvRow[];
    try {
      rows = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvRow[];
    } catch (parseError) {
      return NextResponse.json(
        { error: "CSV 파일 파싱에 실패했습니다. 파일 형식을 확인해주세요." },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV 파일에 데이터가 없습니다." }, { status: 400 });
    }

    // 데이터 검증 및 업데이트
    const errors: string[] = [];
    let updated = 0;
    let notFound = 0;

    const prismaAny = prisma as any;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // 헤더 포함

      // 필수 필드 검증: 이메일은 필수 (한국어 필드명 사용)
      if (!row["(필수)이메일"] || !row["(필수)이메일"].trim()) {
        errors.push(`줄 ${lineNumber}: 이메일이 필요합니다.`);
        continue;
      }

      const email = row["(필수)이메일"].trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`줄 ${lineNumber}: 유효하지 않은 이메일 형식입니다 (${email}).`);
        continue;
      }

      // 사용자 찾기
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: {
          studentProfile: true,
          teacherProfile: true,
        },
      });

      if (!existingUser) {
        errors.push(`줄 ${lineNumber}: 이메일로 사용자를 찾을 수 없습니다 (${email}).`);
        notFound++;
        continue;
      }

      // 역할 검증
      const role = row["역할"]?.trim() || existingUser.role;
      if (row["역할"] && !["student", "teacher", "admin"].includes(row["역할"].trim())) {
        errors.push(`줄 ${lineNumber}: 유효하지 않은 역할입니다 (${row["역할"]}).`);
        continue;
      }

      try {
        // 사용자 기본 정보 업데이트
        const updateData: any = {};
        if (row["이름"] !== undefined) updateData.name = row["이름"]?.trim() || null;
        if (row["학교"] !== undefined) updateData.school = row["학교"]?.trim() || null;
        if (row["지역"] !== undefined) updateData.region = row["지역"]?.trim() || null;
        if (row["역할"] !== undefined) updateData.role = role || null;
        
        // 비밀번호 업데이트 (제공된 경우만)
        if (row["비밀번호"]?.trim()) {
          const password = row["비밀번호"].trim();
          if (password.length < 8) {
            errors.push(`줄 ${lineNumber}: 비밀번호는 최소 8자 이상이어야 합니다.`);
            continue;
          }
          updateData.hashedPassword = await hashPassword(password);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: updateData,
          });
        }

        // 최종 역할 확인 (업데이트 후)
        const finalRole = updateData.role || existingUser.role;

        // 학생 프로필 업데이트 (역할이 student인 경우)
        if (finalRole === "student") {
          // 학번에서 자동 추출할 값들 계산
          const studentId = row["학번"]?.trim() || existingUser.studentProfile?.studentId || null;
          let grade: string | null = null;
          let section: string | null = null;
          let seatNumber: string | null = null;
          let classLabel: string | null = null;

          if (studentId) {
            // 학번의 첫 번째 글자를 학년으로 자동 추출
            if (studentId.length > 0) {
              grade = studentId[0];
            }
            
            // 학번의 2,3번째 값을 숫자로 변환하여 반 필드에 저장 (10 미만이면 한 자리로)
            if (studentId.length >= 3) {
              const sectionValue = parseInt(studentId.substring(1, 3), 10);
              if (!isNaN(sectionValue)) {
                section = sectionValue < 10 ? String(sectionValue) : String(sectionValue);
              }
            }
            
            // 학반 필드는 학년-반 형식으로 저장
            if (grade && section) {
              classLabel = `${grade}-${section}`;
            }
            
            // 번호 필드는 학번의 마지막 2자리 숫자로 저장
            if (studentId.length >= 2) {
              const seatValue = parseInt(studentId.substring(studentId.length - 2), 10);
              if (!isNaN(seatValue)) {
                seatNumber = seatValue < 10 ? String(seatValue) : String(seatValue);
              }
            }
          }

          const studentProfileData: any = {};

          // 학번이 제공된 경우 자동 계산된 값들 사용, 아니면 기존 값 유지
          if (row["학번"] !== undefined) {
            studentProfileData.studentId = studentId;
            if (grade) studentProfileData.grade = grade;
            if (section) studentProfileData.section = section;
            if (classLabel) studentProfileData.classLabel = classLabel;
            if (seatNumber) studentProfileData.seatNumber = seatNumber;
          }

          // 나머지 StudentProfile 필드들
          if (row["전공교과"] !== undefined) studentProfileData.major = row["전공교과"]?.trim() || null;
          if (row["성별"] !== undefined) studentProfileData.sex = row["성별"]?.trim() || null;
          if (row["학급임원"] !== undefined) studentProfileData.classOfficer = row["학급임원"]?.trim() || null;
          if (row["특수교육대상여부"] !== undefined) studentProfileData.specialEducation = row["특수교육대상여부"]?.trim() || null;
          if (row["연락처"] !== undefined) studentProfileData.phoneNumber = row["연락처"]?.trim() || null;
          if (row["형제자매"] !== undefined) studentProfileData.siblings = row["형제자매"]?.trim() || null;
          if (row["학적"] !== undefined) studentProfileData.academicStatus = row["학적"]?.trim() || null;
          if (row["비고"] !== undefined) studentProfileData.remarks = row["비고"]?.trim() || null;
          if (row["동아리"] !== undefined) studentProfileData.club = row["동아리"]?.trim() || null;
          if (row["동아리담당교사"] !== undefined) studentProfileData.clubTeacher = row["동아리담당교사"]?.trim() || null;
          if (row["동아리활동장소"] !== undefined) studentProfileData.clubLocation = row["동아리활동장소"]?.trim() || null;
          if (row["생년월일"] !== undefined) studentProfileData.dateOfBirth = row["생년월일"]?.trim() || null;
          if (row["주소"] !== undefined) studentProfileData.address = row["주소"]?.trim() || null;
          if (row["주민등록번호"] !== undefined) studentProfileData.residentRegistrationNumber = row["주민등록번호"]?.trim() || null;
          if (row["어머니성함"] !== undefined) studentProfileData.motherName = row["어머니성함"]?.trim() || null;
          if (row["어머니연락처"] !== undefined) studentProfileData.motherPhone = row["어머니연락처"]?.trim() || null;
          if (row["어머니관련비고"] !== undefined) studentProfileData.motherRemarks = row["어머니관련비고"]?.trim() || null;
          if (row["아버지성함"] !== undefined) studentProfileData.fatherName = row["아버지성함"]?.trim() || null;
          if (row["아버지연락처"] !== undefined) studentProfileData.fatherPhone = row["아버지연락처"]?.trim() || null;
          if (row["아버지관련비고"] !== undefined) studentProfileData.fatherRemarks = row["아버지관련비고"]?.trim() || null;
          
          // 선택과목 처리 (쉼표로 구분된 문자열을 배열로 변환)
          if (row["선택과목"] !== undefined) {
            studentProfileData.electiveSubjects = row["선택과목"]?.trim()
              ? row["선택과목"].split(",").map((s) => s.trim()).filter(Boolean)
              : [];
          }

          if (Object.keys(studentProfileData).length > 0) {
            if (existingUser.studentProfile) {
              // 기존 프로필 업데이트
              await prismaAny.studentProfile.update({
                where: { userId: existingUser.id },
                data: studentProfileData,
              });
            } else {
              // 새 프로필 생성
              await prismaAny.studentProfile.create({
                data: {
                  userId: existingUser.id,
                  school: row["학교"]?.trim() || existingUser.school || null,
                  ...studentProfileData,
                },
              });
            }
          }
        }

        // 교사 프로필 업데이트 (역할이 teacher인 경우)
        if (finalRole === "teacher") {
          const teacherProfileData: any = {};

          if (row["학교"] !== undefined) teacherProfileData.school = row["학교"]?.trim() || null;
          if (row["직위"] !== undefined) teacherProfileData.roleLabel = row["직위"]?.trim() || null;
          if (row["전공교과"] !== undefined) teacherProfileData.major = row["전공교과"]?.trim() || null;
          if (row["연락처"] !== undefined) teacherProfileData.phoneNumber = row["연락처"]?.trim() || null;
          if (row["비고"] !== undefined) teacherProfileData.remarks = row["비고"]?.trim() || null;
          if (row["동아리"] !== undefined) teacherProfileData.club = row["동아리"]?.trim() || null;
          if (row["동아리활동장소"] !== undefined) teacherProfileData.clubLocation = row["동아리활동장소"]?.trim() || null;
          if (row["생년월일"] !== undefined) teacherProfileData.dateOfBirth = row["생년월일"]?.trim() || null;
          if (row["주소"] !== undefined) teacherProfileData.address = row["주소"]?.trim() || null;

          if (Object.keys(teacherProfileData).length > 0) {
            if (existingUser.teacherProfile) {
              // 기존 프로필 업데이트
              await prismaAny.teacherProfile.update({
                where: { userId: existingUser.id },
                data: teacherProfileData,
              });
            } else {
              // 새 프로필 생성
              await prismaAny.teacherProfile.create({
                data: {
                  userId: existingUser.id,
                  ...teacherProfileData,
                },
              });
            }
          }
        }

        updated++;
      } catch (updateError: any) {
        errors.push(`줄 ${lineNumber}: 업데이트 실패 (${email}): ${updateError.message}`);
      }
    }

    return NextResponse.json({
      message: "사용자 정보 업데이트가 완료되었습니다.",
      updated,
      notFound,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      {
        error: "사용자 정보 업데이트 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

