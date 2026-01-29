import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { parse } from "csv-parse/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParsedRow = Record<string, string>;

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function getField(row: ParsedRow, names: string[]) {
  // Build normalized lookup for csv headers
  const lowerMap: Record<string, string> = {};
  Object.keys(row).forEach((k) => (lowerMap[normalizeKey(k)] = row[k]));

  // Known synonyms including Korean column names
  const headerSynonyms: Record<string, string[]> = {
    title: ["title", "제목"],
    start: ["start", "startdate", "start_date", "date", "시작 날짜", "시작일", "시작"],
    end: ["end", "enddate", "end_date", "종료 날짜", "종료일", "종료", "종료 날짜(선택)"],
    description: ["description", "desc", "설명(선택)"],
    eventType: ["eventType", "event_type", "type", "일정 유형"],
    gradeLevels: ["gradeLevels", "grade_levels", "grades", "학년"],
    periods: ["periods", "교시"],
    department: ["department", "담당 부서", "담당부서"],
    school: ["school", "학교", "학교명", "schoolName"],
    responsiblePerson: ["responsiblePerson", "responsible_person", "담당자", "담당자명"],
    scope: ["scope", "범위"],
    scheduleArea: ["scheduleArea", "schedule_area", "일정 구분"],
  };

  for (const n of names) {
    // try exact key first
    if (row[n] !== undefined) return row[n];

    // try synonyms if available
    const syns = headerSynonyms[n] ?? [];
    for (const s of syns) {
      if (row[s] !== undefined) return row[s];
    }

    // try normalized lookup for original name and synonyms
    const normalized = lowerMap[normalizeKey(n)];
    if (normalized !== undefined) return normalized;
    for (const s of syns) {
      const norm = lowerMap[normalizeKey(s)];
      if (norm !== undefined) return norm;
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const csvText = body?.csvText as string | undefined;
    const preview = Boolean(body?.preview);

    if (!csvText) {
      return NextResponse.json({ error: "csvText가 필요합니다." }, { status: 400 });
    }

    let records: ParsedRow[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRow[];
    } catch (err: any) {
      return NextResponse.json({ error: "CSV 파싱 실패", details: String(err) }, { status: 400 });
    }

    // helper: detect date-only strings like "2026-03-10"
    const isDateOnly = (s: unknown) => {
      if (s === undefined || s === null) return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
    };
    const parseStart = (s: unknown) => {
      if (s === undefined || s === null) return null;
      const str = String(s).trim();
      if (isDateOnly(str)) return new Date(str + "T00:00:00");
      return new Date(str);
    };
    const parseEnd = (s: unknown) => {
      if (s === undefined || s === null) return null;
      const str = String(s).trim();
      if (isDateOnly(str)) return new Date(str + "T23:59:59");
      return new Date(str);
    };

    const errors: Array<{ row: number; msg: string }> = [];
    const toInsert: Array<any> = [];

    records.forEach((r, idx) => {
      const rowNum = idx + 1;
      const title =
        getField(r, ["title", "subject", "event", "name"])?.toString().trim() ?? "";
      const startRaw = getField(r, ["start", "startDate", "start_date", "date"]);
      const endRaw = getField(r, ["end", "endDate", "end_date"]);
      const allDayRaw = getField(r, ["allDay", "allday", "all_day"]);
      const scopeRaw = getField(r, ["scope"]);
      const eventType = getField(r, ["eventType", "event_type", "type"]);
      const description = getField(r, ["description", "desc"]) || "";
      const responsiblePerson = getField(r, ["responsiblePerson", "responsible_person", "담당자", "담당자명"]);
      const schoolRaw = getField(r, ["school", "학교", "학교명", "schoolName"]);
      const teacherIdRaw = getField(r, ["teacherId", "teacher_id", "teacher", "teacher id", "담당 교사"]);
      const department = getField(r, ["department"]);
      const scheduleArea = getField(r, ["scheduleArea", "schedule_area"]);
      const gradeLevelsRaw = getField(r, ["gradeLevels", "grade_levels", "grades"]);
      const periodsRaw = getField(r, ["periods"]);

      if (!title) {
        errors.push({ row: rowNum, msg: "title이 없습니다." });
        return;
      }
      if (!startRaw) {
        errors.push({ row: rowNum, msg: "start(또는 startDate)가 필요합니다." });
        return;
      }
      const startDate = parseStart(startRaw);
      if (!startDate || isNaN(startDate.getTime())) {
        errors.push({ row: rowNum, msg: "start 형식이 유효하지 않습니다." });
        return;
      }

      let endDate: Date | null = null;
      if (endRaw) {
        const d = parseEnd(endRaw);
        if (!d || isNaN(d.getTime())) {
          errors.push({ row: rowNum, msg: "end 형식이 유효하지 않습니다." });
          return;
        }
        endDate = d;
      }

      const allDay = String(allDayRaw ?? "false").toLowerCase() === "true";

      const scope = String(scopeRaw ?? "school").trim() || "school";
      // auto-fill school from session user if available
      const school = session.user?.school ?? (schoolRaw ? String(schoolRaw).trim() : null);
      if (scope === "school" && !school) {
        errors.push({ row: rowNum, msg: "학교 정보가 없어 school scope를 생성할 수 없습니다." });
        return;
      }
      
      const gradeLevels = gradeLevelsRaw
        ? String(gradeLevelsRaw)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const periods = periodsRaw
        ? String(periodsRaw)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      // determine teacherId: prefer CSV value, fallback to session user id
      const teacherId = teacherIdRaw ? String(teacherIdRaw).trim() : session.user?.id;
      // enforce eventType overrides for specific scheduleArea values
      let finalEventType = eventType ? String(eventType).trim() : null;
      if (scheduleArea === "교과") finalEventType = "학사행사";
      else if (scheduleArea === "개인일정(나만 보기)") finalEventType = "개인 일정";
      else if (scheduleArea === "기타") finalEventType = "기타 행사";
      else if (scheduleArea === "창의적 체험활동") {
        const allowed = ["자율*자치", "동아리", "진로", "봉사"];
        if (!finalEventType || !allowed.includes(finalEventType)) {
          finalEventType = "자율*자치";
        }
      }

      toInsert.push({
        title,
        description: description || null,
        startDate: startDate,
        endDate: endDate,
        eventType: finalEventType || null,
        scope,
        school: school,
        teacherId: teacherId,
        department: department || null,
        scheduleArea: scheduleArea || null,
        responsiblePerson: responsiblePerson || null,
        gradeLevels,
        periods,
        createdBy: session.user?.id,
      });
    });

    // Return preview
    if (preview) {
      const previewRows = toInsert.slice(0, 200).map((r, idx) => ({
        row: idx + 1,
        title: r.title,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate ? r.endDate.toISOString() : null,
        scope: r.scope,
        eventType: r.eventType,
      }));
      return NextResponse.json({ preview: previewRows, errors }, { status: 200 });
    }

    // Actual insert: chunked transactions
    const chunkSize = 50;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const ops = chunk.map((item) =>
        prisma.calendarEvent.create({
          data: {
            title: item.title,
            description: item.description,
            startDate: item.startDate,
            endDate: item.endDate,
            eventType: item.eventType,
            scope: item.scope,
            school: item.school,
            teacherId: item.teacherId,
            department: item.department,
            scheduleArea: item.scheduleArea,
            responsiblePerson: item.responsiblePerson,
            gradeLevels: item.gradeLevels,
            periods: item.periods,
            createdBy: item.createdBy,
          },
        })
      );
      await prisma.$transaction(ops);
      inserted += chunk.length;
    }

    return NextResponse.json({ inserted, errors }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}


