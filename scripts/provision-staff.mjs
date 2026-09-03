import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "STAFF_EMAIL",
  "STAFF_PASSWORD",
  "STAFF_FULL_NAME",
  "STAFF_ROLE",
  "INSTITUTION_ID",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const role = process.env.STAFF_ROLE;
if (!["SYSTEM_ADMIN", "HOMEROOM_TEACHER", "OPERATOR"].includes(role)) {
  console.error("STAFF_ROLE must be SYSTEM_ADMIN, HOMEROOM_TEACHER, or OPERATOR.");
  process.exit(1);
}

if (
  role === "HOMEROOM_TEACHER" &&
  (!process.env.CLASS_ID || !process.env.ACADEMIC_YEAR_ID)
) {
  console.error("HOMEROOM_TEACHER requires CLASS_ID and ACADEMIC_YEAR_ID.");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email: process.env.STAFF_EMAIL,
  password: process.env.STAFF_PASSWORD,
  email_confirm: true,
});

if (createError || !created.user) {
  console.error(`Failed to create Auth user: ${createError?.message ?? "unknown error"}`);
  process.exit(1);
}

const userId = created.user.id;
let profileLinked = false;

try {
  const { data, error } = await supabase.rpc("provision_staff_profile", {
    p_actor_user_id: process.env.ACTOR_USER_ID || null,
    p_target_user_id: userId,
    p_full_name: process.env.STAFF_FULL_NAME,
    p_role: role,
    p_institution_id: process.env.INSTITUTION_ID,
    p_class_id: process.env.CLASS_ID || null,
    p_academic_year_id: process.env.ACADEMIC_YEAR_ID || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  profileLinked = true;
  console.log("Staff account provisioned successfully.");
  console.log(
    JSON.stringify(
      {
        userId,
        email: process.env.STAFF_EMAIL,
        role,
        profile: data,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    `Profile provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  if (!profileLinked) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(userId);

    if (cleanupError) {
      console.error(
        `Auth user cleanup also failed for ${userId}: ${cleanupError.message}`,
      );
    } else {
      console.error("Created Auth user was removed because profile provisioning failed.");
    }

    process.exitCode = 1;
  }
}
