const PORTFOLIO_PREVIEW_URL = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/d85573f8-b6c9-4905-8fed-fd3232be52da.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjI2YzNhNTFkN2NiNzgwYiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDIyODU2MX0.H7E5BzhzuwXo643QOAfaZP58gO8tpbOUzTe_DXgpmLM";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.redirect(PORTFOLIO_PREVIEW_URL, 307);
}
