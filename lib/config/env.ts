import { z } from "zod";

import type { PublicEnv, ServerEnv } from "@/types";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("RentalShield NYC"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3006"),
  AWS_REGION: z.string().default("us-east-1"),
  BEDROCK_MODEL_ID: z.string().default("anthropic.claude-3-7-sonnet-20250219-v1:0"),
  BEDROCK_FALLBACK_MODEL_ID: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  RENTCAST_API_KEY: z.string().optional(),
  NYC_OPEN_DATA_APP_TOKEN: z.string().optional(),
  NY_LICENSE_LOOKUP_BASE_URL: z.string().optional(),
  MAX_UPLOAD_FILE_SIZE_MB: z.coerce.number().default(10),
  MAX_UPLOAD_FILE_COUNT: z.coerce.number().default(5),
});

const parsedEnv = envSchema.parse(process.env);

export const publicEnv: PublicEnv = {
  appName: parsedEnv.NEXT_PUBLIC_APP_NAME,
  appUrl: parsedEnv.NEXT_PUBLIC_APP_URL,
};

export const serverEnv: ServerEnv = {
  appName: parsedEnv.NEXT_PUBLIC_APP_NAME,
  appUrl: parsedEnv.NEXT_PUBLIC_APP_URL,
  awsRegion: parsedEnv.AWS_REGION,
  bedrockModelId: parsedEnv.BEDROCK_MODEL_ID,
  bedrockFallbackModelId: parsedEnv.BEDROCK_FALLBACK_MODEL_ID,
  supabaseUrl: parsedEnv.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: parsedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: parsedEnv.SUPABASE_SERVICE_ROLE_KEY,
  googleMapsApiKey: parsedEnv.GOOGLE_MAPS_API_KEY,
  rentcastApiKey: parsedEnv.RENTCAST_API_KEY,
  nycOpenDataAppToken: parsedEnv.NYC_OPEN_DATA_APP_TOKEN,
  nyLicenseLookupBaseUrl: parsedEnv.NY_LICENSE_LOOKUP_BASE_URL,
  maxUploadFileSizeMb: parsedEnv.MAX_UPLOAD_FILE_SIZE_MB,
  maxUploadFileCount: parsedEnv.MAX_UPLOAD_FILE_COUNT,
};
