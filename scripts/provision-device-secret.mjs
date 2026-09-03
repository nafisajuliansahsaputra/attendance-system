import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "DEVICE_ID"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const deviceId = process.env.DEVICE_ID;
const secret = `ats_dev_${randomBytes(32).toString("base64url")}`;
const secretHash = `sha256:${createHash("sha256").update(secret, "utf8").digest("hex")}`;

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

const { data, error } = await supabase.rpc("set_device_secret_hash", {
  p_device_id: deviceId,
  p_secret_hash: secretHash,
});

if (error) {
  console.error(`Failed to rotate device secret: ${error.message}`);
  process.exit(1);
}

console.log("Device secret rotated successfully.");
console.log("Store the plaintext secret on the device/bridge now; it is not recoverable later.");
console.log(
  JSON.stringify(
    {
      device: data,
      secret,
    },
    null,
    2,
  ),
);
