type NeisResult = {
  CODE: string;
  MESSAGE: string;
};

type NeisDataset<T> = Array<
  | { head?: Array<{ list_total_count?: number } | { RESULT?: NeisResult }> }
  | { row?: T[] }
>;

type SchoolInfoRow = {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
};

type MealDietRow = {
  MLSV_YMD: string;
  MMEAL_SC_NM?: string;
  DDISH_NM?: string;
  CAL_INFO?: string;
};

export type WeeklyMealItem = {
  mealType: string;
  menu: string;
  calories?: string;
};

export type WeeklyMealDay = {
  isoDate: string;
  dateLabel: string;
  meals: WeeklyMealItem[];
};

const NEIS_BASE_URL = "https://open.neis.go.kr/hub";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

function getResultCode<T>(dataset: NeisDataset<T> | undefined): string | null {
  const head = dataset?.[0] as { head?: Array<{ RESULT?: NeisResult }> } | undefined;
  const result = head?.head?.find((item) => item.RESULT)?.RESULT;
  return result?.CODE ?? null;
}

function getRows<T>(dataset: NeisDataset<T> | undefined): T[] {
  const rowObject = dataset?.find((item) => "row" in item) as { row?: T[] } | undefined;
  return rowObject?.row ?? [];
}

async function fetchNeisDataset<T>(
  service: string,
  responseKey: string,
  params: Record<string, string>
): Promise<NeisDataset<T>> {
  const key = getRequiredEnv("NEIS_API_KEY");
  const query = new URLSearchParams({
    KEY: key,
    Type: "json",
    pIndex: "1",
    pSize: "1000",
    ...params,
  });

  const response = await fetch(`${NEIS_BASE_URL}/${service}?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NEIS API 호출 실패: ${response.status}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const dataset = json[responseKey] as NeisDataset<T> | undefined;
  if (!dataset) {
    const result = json.RESULT as NeisResult | undefined;
    if (result?.CODE) throw new Error(`NEIS 오류(${result.CODE}): ${result.MESSAGE}`);
    throw new Error("NEIS 응답 형식이 올바르지 않습니다.");
  }
  return dataset;
}

async function resolveSchoolCodeByName(schoolName: string) {
  const trimmedSchoolName = schoolName.trim();
  if (!trimmedSchoolName) {
    throw new Error("학교 정보가 없어 급식 정보를 조회할 수 없습니다.");
  }

  const atptCode = process.env.NEIS_ATPT_OFCDC_SC_CODE?.trim();
  const schoolKind = process.env.NEIS_SCHUL_KND_SC_NM?.trim();
  const fixedSchoolCode = process.env.NEIS_SD_SCHUL_CODE?.trim();

  if (atptCode && fixedSchoolCode) {
    return { atptCode, schoolCode: fixedSchoolCode, schoolName: trimmedSchoolName };
  }

  const dataset = await fetchNeisDataset<SchoolInfoRow>("schoolInfo", "schoolInfo", {
    SCHUL_NM: trimmedSchoolName,
    ...(atptCode ? { ATPT_OFCDC_SC_CODE: atptCode } : {}),
    ...(schoolKind ? { SCHUL_KND_SC_NM: schoolKind } : {}),
  });

  if (getResultCode(dataset) === "INFO-200") {
    throw new Error(`NEIS 학교 정보를 찾을 수 없습니다: ${trimmedSchoolName}`);
  }

  const rows = getRows(dataset);
  const matched =
    rows.find((row) => row.SCHUL_NM === trimmedSchoolName) ??
    rows.find((row) => row.SCHUL_NM.includes(trimmedSchoolName));

  if (!matched?.ATPT_OFCDC_SC_CODE || !matched?.SD_SCHUL_CODE) {
    throw new Error(`학교 코드 확인 실패: ${trimmedSchoolName}`);
  }

  return {
    atptCode: matched.ATPT_OFCDC_SC_CODE,
    schoolCode: matched.SD_SCHUL_CODE,
    schoolName: matched.SCHUL_NM,
  };
}

function normalizeDishName(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\s*\(\d+(?:\.\d+)*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function fetchWeeklyMealDiet(
  schoolName: string,
  fromYmd: string,
  toYmd: string
): Promise<{ schoolName: string; rows: MealDietRow[] }> {
  const resolved = await resolveSchoolCodeByName(schoolName);

  let dataset: NeisDataset<MealDietRow>;
  try {
    dataset = await fetchNeisDataset<MealDietRow>("mealServiceDietInfo", "mealServiceDietInfo", {
      ATPT_OFCDC_SC_CODE: resolved.atptCode,
      SD_SCHUL_CODE: resolved.schoolCode,
      MLSV_FROM_YMD: fromYmd,
      MLSV_TO_YMD: toYmd,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("INFO-200")) {
      return { schoolName: resolved.schoolName, rows: [] };
    }
    throw error;
  }

  if (getResultCode(dataset) === "INFO-200") {
    return { schoolName: resolved.schoolName, rows: [] };
  }

  return {
    schoolName: resolved.schoolName,
    rows: getRows(dataset),
  };
}

export function buildWeeklyMealDays(
  isoDates: string[],
  dateLabelByIso: Record<string, string>,
  mealRows: MealDietRow[]
): WeeklyMealDay[] {
  return isoDates.map((isoDate) => {
    const ymd = isoDate.replace(/-/g, "");
    const meals = mealRows
      .filter((row) => row.MLSV_YMD === ymd)
      .map((row) => ({
        mealType: row.MMEAL_SC_NM || "급식",
        menu: normalizeDishName(row.DDISH_NM),
        calories: row.CAL_INFO || undefined,
      }));

    return {
      isoDate,
      dateLabel: dateLabelByIso[isoDate] || isoDate,
      meals,
    };
  });
}
