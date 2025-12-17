import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";
import { parse } from "csv-parse/sync";

type CsvRow = {
  // User 필드 (한국어 필드명 - CSV 템플릿에 "(필수)" 접두사 포함)
  "(필수)이메일"?: string;
  "(필수)이름"?: string;
  "(필수)학교"?: string;
  "(필수)지역"?: string;
  "(필수)역할"?: string;
  "(필수)비밀번호"?: string;
  
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
  
  // ParentProfile 필드 (role이 "parent"일 때)
  "자녀이메일"?: string; // 쉼표로 구분된 자녀 학생들의 이메일
};

const DEFAULT_PASSWORD = "Abcd1234!@";

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

    // 데이터 검증 및 변환
    const errors: string[] = [];
    const validUsers: Array<{
      email: string;
      hashedPassword: string;
      name: string | null;
      school: string | null;
      region: string | null;
      role: string | null;
      emailVerified: Date;
      row: CsvRow; // 원본 row 데이터를 저장하여 Profile 생성 시 사용
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // 헤더 포함

      // 필수 필드 검증 (한국어 필드명 사용 - "(필수)" 접두사 포함)
      if (!row["(필수)이메일"] || !row["(필수)이메일"].trim()) {
        errors.push(`줄 ${lineNumber}: 이메일이 필요합니다.`);
        continue;
      }

      const email = row["(필수)이메일"].trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`줄 ${lineNumber}: 유효하지 않은 이메일 형식입니다 (${email}).`);
        continue;
      }

      // 역할 검증
      const role = row["(필수)역할"]?.trim() || null;
      if (role && !["student", "teacher", "admin", "parent"].includes(role)) {
        errors.push(`줄 ${lineNumber}: 유효하지 않은 역할입니다 (${role}).`);
        continue;
      }

      // 비밀번호 처리
      const password = row["(필수)비밀번호"]?.trim() || DEFAULT_PASSWORD;
      if (password.length < 8) {
        errors.push(`줄 ${lineNumber}: 비밀번호는 최소 8자 이상이어야 합니다.`);
        continue;
      }

      const hashedPassword = await hashPassword(password);

      validUsers.push({
        email,
        hashedPassword,
        name: row["(필수)이름"]?.trim() || null,
        school: row["(필수)학교"]?.trim() || null,
        region: row["(필수)지역"]?.trim() || null,
        role,
        emailVerified: new Date(), // 이메일 인증 없이 바로 활성화
        row, // 원본 row 데이터 저장
      });
    }

    if (validUsers.length === 0) {
      return NextResponse.json(
        {
          error: "유효한 사용자 데이터가 없습니다.",
          errors,
        },
        { status: 400 }
      );
    }

    // 중복 이메일 확인
    const emails = validUsers.map((u) => u.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    // 중복 제외
    const toInsert = validUsers.filter((u) => !existingEmails.has(u.email));
    const skipped = validUsers.length - toInsert.length;

    // 사용자 생성 (개별 생성으로 변경 - Profile을 함께 생성하기 위해)
    let created = 0;
    for (const userData of toInsert) {
      try {
        // User 생성
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            hashedPassword: userData.hashedPassword,
            name: userData.name,
            school: userData.school,
            region: userData.region,
            role: userData.role,
            emailVerified: userData.emailVerified,
          },
        });

        // Profile 생성 (role에 따라)
        if (user.role === "student") {
          const row = userData.row;
          const electiveSubjects = row["선택과목"]?.trim()
            ? row["선택과목"].split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          // 학번의 첫 번째 글자를 학년으로 자동 추출
          const studentId = row["학번"]?.trim() || null;
          const grade = studentId && studentId.length > 0 ? studentId[0] : null;
          
          // 학번의 2,3번째 값을 숫자로 변환하여 반 필드에 저장 (10 미만이면 한 자리로)
          let section: string | null = null;
          if (studentId && studentId.length >= 3) {
            const sectionValue = parseInt(studentId.substring(1, 3), 10);
            if (!isNaN(sectionValue)) {
              section = sectionValue < 10 ? String(sectionValue) : String(sectionValue);
            }
          }
          
          // 학반 필드는 학년-반 형식으로 저장 (예: "1-1", "2-10")
          const classLabel = grade && section ? `${grade}-${section}` : null;
          
          // 번호 필드는 학번의 마지막 2자리 숫자로 저장
          let seatNumber: string | null = null;
          if (studentId && studentId.length >= 2) {
            const seatValue = parseInt(studentId.substring(studentId.length - 2), 10);
            if (!isNaN(seatValue)) {
              seatNumber = seatValue < 10 ? String(seatValue) : String(seatValue);
            }
          }

          await prisma.studentProfile.create({
            data: {
              userId: user.id,
              studentId: studentId,
              school: row["(필수)학교"]?.trim() || null,
              grade: grade, // 학번의 첫 번째 글자에서 자동 추출
              classLabel: classLabel, // 학년-반 형식으로 자동 생성 (예: "1-1")
              section: section, // 학번의 2,3번째 값에서 자동 추출 (10 미만이면 한 자리)
              seatNumber: seatNumber, // 학번의 마지막 2자리 숫자에서 자동 추출
              major: row["전공교과"]?.trim() || null,
              sex: row["성별"]?.trim() || null,
              classOfficer: row["학급임원"]?.trim() || null,
              specialEducation: row["특수교육대상여부"]?.trim() || null,
              phoneNumber: row["연락처"]?.trim() || null,
              siblings: row["형제자매"]?.trim() || null,
              academicStatus: row["학적"]?.trim() || null,
              remarks: row["비고"]?.trim() || null,
              club: row["동아리"]?.trim() || null,
              clubTeacher: row["동아리담당교사"]?.trim() || null,
              clubLocation: row["동아리활동장소"]?.trim() || null,
              dateOfBirth: row["생년월일"]?.trim() || null,
              address: row["주소"]?.trim() || null,
              residentRegistrationNumber: row["주민등록번호"]?.trim() || null,
              motherName: row["어머니성함"]?.trim() || null,
              motherPhone: row["어머니연락처"]?.trim() || null,
              motherRemarks: row["어머니관련비고"]?.trim() || null,
              fatherName: row["아버지성함"]?.trim() || null,
              fatherPhone: row["아버지연락처"]?.trim() || null,
              fatherRemarks: row["아버지관련비고"]?.trim() || null,
              electiveSubjects,
            },
          });
        } else if (user.role === "teacher") {
          const row = userData.row;
          await prisma.teacherProfile.create({
            data: {
              userId: user.id,
              school: row["(필수)학교"]?.trim() || null,
              roleLabel: row["직위"]?.trim() || null,
              major: row["전공교과"]?.trim() || null,
              classLabel: null, // CSV에서 제거됨
              grade: null, // CSV에서 제거됨
              section: null, // CSV에서 제거됨
              phoneNumber: row["연락처"]?.trim() || null,
              remarks: row["비고"]?.trim() || null,
              club: row["동아리"]?.trim() || null,
              clubLocation: row["동아리활동장소"]?.trim() || null,
              dateOfBirth: row["생년월일"]?.trim() || null,
              address: row["주소"]?.trim() || null,
            },
          });
        } else if (user.role === "parent") {
          // ParentProfile 생성 (자녀이메일로 자녀 학생 찾기)
          const row = userData.row;
          const childEmailsFromCsv = row["자녀이메일"]?.trim();
          const studentUserIds: string[] = [];

          if (childEmailsFromCsv) {
            // 쉼표로 구분된 이메일들을 분리
            const childEmails = childEmailsFromCsv
              .split(",")
              .map((email) => email.trim().toLowerCase())
              .filter((email) => email.length > 0);

            if (childEmails.length > 0) {
              // 이메일로 학생 찾기
              const students = await prisma.user.findMany({
                where: {
                  email: { in: childEmails },
                  role: "student",
                },
                select: { id: true },
              });

              // User.id 수집
              studentUserIds.push(...students.map((s) => s.id));
            }
          }

          // ParentProfile 생성 (학생이 없어도 생성)
          const prismaAny = prisma as any;
          await prismaAny.parentProfile.create({
            data: {
              userId: user.id,
              studentIds: studentUserIds,
              phoneNumber: row["연락처"]?.trim() || null,
              relationship: "parent", // 기본값
            },
          });
        }
        // admin role은 Profile이 없으므로 User만 생성됨

        created += 1;
      } catch (individualError: any) {
        if (individualError.code === "P2002") {
          // 중복 이메일 (이미 존재)
          continue;
        } else {
          // 중복이 아닌 다른 오류
          errors.push(`사용자 생성 실패 (${userData.email}): ${individualError.message}`);
        }
      }
    }

    return NextResponse.json({
      message: "사용자 등록이 완료되었습니다.",
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      {
        error: "사용자 등록 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

