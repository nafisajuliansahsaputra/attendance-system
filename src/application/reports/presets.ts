import type { ReportingPeriodPresets } from "./types";

export interface ReportDatePreset {
  label: string;
  from: string;
  to: string;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function earlierDate(first: string, second: string): string {
  return first <= second ? first : second;
}

export function buildReportDatePresets(input: {
  today: string;
  periods: ReportingPeriodPresets;
}): ReportDatePreset[] {
  const monthStart = `${input.today.slice(0, 7)}-01`;
  const presets: ReportDatePreset[] = [
    {
      label: "7 hari",
      from: shiftDate(input.today, -6),
      to: input.today,
    },
    {
      label: "Bulan ini",
      from: monthStart,
      to: input.today,
    },
  ];

  input.periods.terms
    .filter((term) => term.startsOn <= input.today)
    .forEach((term) => {
      presets.push({
        label: term.name,
        from: term.startsOn,
        to: earlierDate(term.endsOn, input.today),
      });
    });

  const academicYear = input.periods.academicYear;
  if (academicYear && academicYear.startsOn <= input.today) {
    presets.push({
      label: `Tahun Ajaran ${academicYear.label}`,
      from: academicYear.startsOn,
      to: earlierDate(academicYear.endsOn, input.today),
    });
  }

  return presets;
}
