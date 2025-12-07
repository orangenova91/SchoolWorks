import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 관리자의 학교 정보 가져오기
    const adminSchool = session.user.school;

    // superadmin인 경우 모든 사용자, admin인 경우 같은 학교의 사용자만
    const userWhereCondition = session.user.role === "superadmin" 
      ? undefined 
      : adminSchool 
      ? { school: adminSchool }
      : { school: null }; // 학교 정보가 없는 경우 빈 결과

    const prismaAny = prisma as any;

    // 먼저 사용자 목록 가져오기
    const users = await prisma.user.findMany({
      where: userWhereCondition,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        school: true,
        region: true,
        role: true,
      },
    });

    // 해당 사용자들의 studentProfile 가져오기
    const userIds = users.map((user) => user.id);
    const studentProfiles = userIds.length > 0
      ? await prismaAny.studentProfile.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            studentId: true,
            major: true,
            sex: true,
            classOfficer: true,
            specialEducation: true,
            phoneNumber: true,
            siblings: true,
            academicStatus: true,
            remarks: true,
            club: true,
            clubTeacher: true,
            clubLocation: true,
            dateOfBirth: true,
            address: true,
            residentRegistrationNumber: true,
            motherName: true,
            motherPhone: true,
            motherRemarks: true,
            fatherName: true,
            fatherPhone: true,
            fatherRemarks: true,
            electiveSubjects: true,
          },
        })
      : [];

    // 해당 사용자들의 teacherProfile 가져오기
    const teacherProfiles = userIds.length > 0
      ? await prismaAny.teacherProfile.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            roleLabel: true,
            major: true,
            phoneNumber: true,
            remarks: true,
            club: true,
            clubLocation: true,
            dateOfBirth: true,
            address: true,
          },
        })
      : [];

    // 프로필 맵 생성
    const studentProfileMap = new Map(
      studentProfiles.map((profile: any) => [profile.userId, profile])
    );
    const teacherProfileMap = new Map(
      teacherProfiles.map((profile: any) => [profile.userId, profile])
    );

    // CSV 헤더 (수정 템플릿: 이메일만 필수)
    const headers = [
      // User 필드
      "(필수)이메일", "이름", "학교", "지역", "역할", "비밀번호",
      // StudentProfile 필드
      "학번",
      "전공교과", "성별", "학급임원", "특수교육대상여부", "연락처",
      "형제자매", "학적", "비고", "동아리", "동아리담당교사",
      "동아리활동장소", "생년월일", "주소", "주민등록번호",
      "어머니성함", "어머니연락처", "어머니관련비고",
      "아버지성함", "아버지연락처", "아버지관련비고", "선택과목",
      // TeacherProfile 필드
      "직위"
    ];

    // CSV 데이터 생성
    const csvRows = users.map((user) => {
      const studentProfile = studentProfileMap.get(user.id);
      const teacherProfile = teacherProfileMap.get(user.id);
      
      // 선택과목은 배열이므로 쉼표로 구분된 문자열로 변환
      const electiveSubjects = studentProfile?.electiveSubjects 
        ? (Array.isArray(studentProfile.electiveSubjects) 
            ? studentProfile.electiveSubjects.join(",") 
            : studentProfile.electiveSubjects)
        : "";

      return [
        // User 필드
        user.email || "",
        user.name || "",
        user.school || "",
        user.region || "",
        user.role || "",
        "", // 비밀번호는 수정 템플릿에 포함하지 않음
        // StudentProfile 필드
        user.role === "student" && studentProfile?.studentId ? studentProfile.studentId : "",
        user.role === "student" && studentProfile?.major ? studentProfile.major : "",
        user.role === "student" && studentProfile?.sex ? studentProfile.sex : "",
        user.role === "student" && studentProfile?.classOfficer ? studentProfile.classOfficer : "",
        user.role === "student" && studentProfile?.specialEducation ? studentProfile.specialEducation : "",
        user.role === "student" && studentProfile?.phoneNumber ? studentProfile.phoneNumber : (user.role === "teacher" && teacherProfile?.phoneNumber ? teacherProfile.phoneNumber : ""),
        user.role === "student" && studentProfile?.siblings ? studentProfile.siblings : "",
        user.role === "student" && studentProfile?.academicStatus ? studentProfile.academicStatus : "",
        user.role === "student" && studentProfile?.remarks ? studentProfile.remarks : (user.role === "teacher" && teacherProfile?.remarks ? teacherProfile.remarks : ""),
        user.role === "student" && studentProfile?.club ? studentProfile.club : (user.role === "teacher" && teacherProfile?.club ? teacherProfile.club : ""),
        user.role === "student" && studentProfile?.clubTeacher ? studentProfile.clubTeacher : "",
        user.role === "student" && studentProfile?.clubLocation ? studentProfile.clubLocation : (user.role === "teacher" && teacherProfile?.clubLocation ? teacherProfile.clubLocation : ""),
        user.role === "student" && studentProfile?.dateOfBirth ? studentProfile.dateOfBirth : (user.role === "teacher" && teacherProfile?.dateOfBirth ? teacherProfile.dateOfBirth : ""),
        user.role === "student" && studentProfile?.address ? studentProfile.address : (user.role === "teacher" && teacherProfile?.address ? teacherProfile.address : ""),
        user.role === "student" && studentProfile?.residentRegistrationNumber ? studentProfile.residentRegistrationNumber : "",
        user.role === "student" && studentProfile?.motherName ? studentProfile.motherName : "",
        user.role === "student" && studentProfile?.motherPhone ? studentProfile.motherPhone : "",
        user.role === "student" && studentProfile?.motherRemarks ? studentProfile.motherRemarks : "",
        user.role === "student" && studentProfile?.fatherName ? studentProfile.fatherName : "",
        user.role === "student" && studentProfile?.fatherPhone ? studentProfile.fatherPhone : "",
        user.role === "student" && studentProfile?.fatherRemarks ? studentProfile.fatherRemarks : "",
        electiveSubjects,
        // TeacherProfile 필드
        user.role === "teacher" && teacherProfile?.roleLabel ? teacherProfile.roleLabel : "",
      ];
    });

    // CSV 형식으로 변환
    const escapeCsvValue = (value: string | null | undefined) => {
      const str = value?.toString() || "";
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.map(escapeCsvValue).join(",")),
    ].join("\n");

    // BOM 추가 (한글 깨짐 방지)
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    // Response 반환
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": 'attachment; filename="users_update_template.csv"',
      },
    });
  } catch (error: any) {
    console.error("Export template error:", error);
    return NextResponse.json(
      {
        error: "템플릿 다운로드 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

