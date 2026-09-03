import { describe, expect, it } from "vitest";
import { buildReportDatePresets } from "./presets";

describe("buildReportDatePresets", () => {
  it("clips started academic periods to today and hides future terms", () => {
    expect(
      buildReportDatePresets({
        today: "2026-09-03",
        periods: {
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
        },
      }),
    ).toEqual([
      {
        label: "7 hari",
        from: "2026-08-28",
        to: "2026-09-03",
      },
      {
        label: "Bulan ini",
        from: "2026-09-01",
        to: "2026-09-03",
      },
      {
        label: "Semester Ganjil",
        from: "2026-07-01",
        to: "2026-09-03",
      },
      {
        label: "Tahun Ajaran 2026/2027",
        from: "2026-07-01",
        to: "2026-09-03",
      },
    ]);
  });

  it("uses a completed term end date instead of extending it to today", () => {
    const presets = buildReportDatePresets({
      today: "2027-02-01",
      periods: {
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
        ],
      },
    });

    expect(presets.find((item) => item.label === "Semester Ganjil")).toEqual({
      label: "Semester Ganjil",
      from: "2026-07-01",
      to: "2026-12-31",
    });
  });
});
