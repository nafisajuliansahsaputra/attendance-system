import { describe, expect, it } from "vitest";
import { parseReportingPeriodPresets } from "./supabase-report-periods";

describe("parseReportingPeriodPresets", () => {
  it("maps an active academic year and ordered terms", () => {
    expect(
      parseReportingPeriodPresets({
        academicYear: {
          id: "11111111-1111-4111-8111-111111111201",
          label: "2026/2027",
          startsOn: "2026-07-01",
          endsOn: "2027-06-30",
        },
        terms: [
          {
            id: "11111111-1111-4111-8111-111111111211",
            name: "Semester Ganjil",
            sequence: 1,
            startsOn: "2026-07-01",
            endsOn: "2026-12-31",
          },
          {
            id: "11111111-1111-4111-8111-111111111212",
            name: "Semester Genap",
            sequence: 2,
            startsOn: "2027-01-01",
            endsOn: "2027-06-30",
          },
        ],
      }),
    ).toEqual({
      academicYear: {
        id: "11111111-1111-4111-8111-111111111201",
        label: "2026/2027",
        startsOn: "2026-07-01",
        endsOn: "2027-06-30",
      },
      terms: [
        {
          id: "11111111-1111-4111-8111-111111111211",
          name: "Semester Ganjil",
          sequence: 1,
          startsOn: "2026-07-01",
          endsOn: "2026-12-31",
        },
        {
          id: "11111111-1111-4111-8111-111111111212",
          name: "Semester Genap",
          sequence: 2,
          startsOn: "2027-01-01",
          endsOn: "2027-06-30",
        },
      ],
    });
  });

  it("allows institutions with no active academic year", () => {
    expect(
      parseReportingPeriodPresets({ academicYear: null, terms: [] }),
    ).toEqual({
      academicYear: undefined,
      terms: [],
    });
  });
});
