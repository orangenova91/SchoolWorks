import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { parse } from "csv-parse/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParsedRow = Record<string, string>;

function getField(row: ParsedRow, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const name of names) {
    const found = keys.find(
      (k) => k.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (found && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return undefined;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = session.user?.school;
    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const csvText = body?.csvText as string | undefined;
    const preview = Boolean(body?.preview);

    if (!csvText) {
      return NextResponse.json(
        { error: "csvText가 필요합니다." },
        { status: 400 }
      );
    }

    let records: ParsedRow[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as ParsedRow[];
    } catch (err: unknown) {
      return NextResponse.json(
        { error: "CSV 파싱 실패", details: String(err) },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; msg: string }> = [];
    const toUpsert: Array<{
      date: string;
      csvRow: ParsedRow;
    }> = [];

    const mealKeys = ["급식지도1", "급식지도2", "급식지도3", "급식지도4", "급식지도5"];
    const evKeys = ["야자감독1", "야자감독2", "야자감독3", "야자감독4", "야자감독5"];

    for (let idx = 0; idx < records.length; idx++) {
      const r = records[idx];
      const rowNum = idx + 1;

      const dateRaw =
        getField(r, ["날짜", "date"]) ??
        getField(r, ["시작 날짜", "시작일"]) ??
        "";
      if (!dateRaw) {
        errors.push({ row: rowNum, msg: "날짜가 없습니다." });
        continue;
      }

      const dateMatch = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        errors.push({ row: rowNum, msg: "날짜 형식은 YYYY-MM-DD여야 합니다." });
        continue;
      }

      const dateObj = new Date(dateRaw + "T00:00:00.000Z");
      if (isNaN(dateObj.getTime())) {
        errors.push({ row: rowNum, msg: "유효하지 않은 날짜입니다." });
        continue;
      }

      if (!isWeekday(dateObj)) {
        errors.push({ row: rowNum, msg: "평일(월~금)만 입력할 수 있습니다." });
        continue;
      }

      toUpsert.push({
        date: dateRaw,
        csvRow: r,
      });
    }

    if (preview) {
      const previewRows = toUpsert.slice(0, 200).map((item, i) => {
        const mg = mealKeys.map((k) => getField(item.csvRow, [k]) ?? "").filter(Boolean);
        const ev = evKeys.map((k) => getField(item.csvRow, [k]) ?? "").filter(Boolean);
        const remarksRaw = getField(item.csvRow, ["비고", "remarks"]);
        return {
          row: i + 1,
          date: item.date,
          mealGuidance: mg.join(", ") || "—",
          eveningSupervision: ev.join(", ") || "—",
          remarks: remarksRaw ? remarksRaw.trim() : "—",
        };
      });
      return NextResponse.json({
        preview: previewRows,
        errors,
      });
    }

    let upserted = 0;
    for (const item of toUpsert) {
      const r = item.csvRow;
      const dateObj = new Date(item.date + "T00:00:00.000Z");

      const existing = await (prisma as any).supervisionMealSchedule.findUnique({
        where: { school_date: { school, date: dateObj } },
      });
      const existingMg = Array.isArray(existing?.mealGuidance) ? existing.mealGuidance : [];
      const existingEv = Array.isArray(existing?.eveningSupervision) ? existing.eveningSupervision : [];

      const mealGuidance = mealKeys
        .map((k, idx) => {
          const csvVal = getField(r, [k]);
          if (csvVal !== undefined) return csvVal;
          return existingMg[idx] ?? "";
        })
        .filter(Boolean);
      const eveningSupervision = evKeys
        .map((k, idx) => {
          const csvVal = getField(r, [k]);
          if (csvVal !== undefined) return csvVal;
          return existingEv[idx] ?? "";
        })
        .filter(Boolean);
      const remarksCsv = getField(r, ["비고", "remarks"]);
      const remarks =
        remarksCsv !== undefined ? (remarksCsv.trim() || null) : (existing?.remarks ?? null);

      await (prisma as any).supervisionMealSchedule.upsert({
        where: {
          school_date: { school, date: dateObj },
        },
        create: {
          school,
          date: dateObj,
          mealGuidance,
          eveningSupervision,
          remarks,
        },
        update: {
          mealGuidance,
          eveningSupervision,
          remarks,
        },
      });
      upserted++;
    }

    return NextResponse.json({
      inserted: upserted,
      errors,
    });
  } catch (error: unknown) {
    console.error("Supervision meal bulk upload error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
