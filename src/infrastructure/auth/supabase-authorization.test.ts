import { describe, expect, it } from "vitest";
import { parseAuthorizationContext } from "./supabase-authorization";

describe("parseAuthorizationContext", () => {
  it("accepts a server-resolved homeroom scope", () => {
    const context = parseAuthorizationContext({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      institutionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      fullName: "Wali Kelas Demo",
      role: "HOMEROOM_TEACHER",
      schoolDate: "2026-09-03",
      classes: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          code: "X-RPL-1",
          name: "X RPL 1",
        },
      ],
    });

    expect(context.role).toBe("HOMEROOM_TEACHER");
    expect(context.classes).toHaveLength(1);
  });

  it("rejects an unrecognized application role", () => {
    expect(() =>
      parseAuthorizationContext({
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        institutionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        fullName: "Unauthorized Demo",
        role: "SUPERUSER",
        schoolDate: "2026-09-03",
        classes: [],
      }),
    ).toThrow();
  });
});
