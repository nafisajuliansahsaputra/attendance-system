import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terminal/lab"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard/",
          "/login",
          "/masuk-petugas",
          "/teacher/",
          "/terminal",
          "/unauthorized",
        ],
      },
    ],
  };
}
