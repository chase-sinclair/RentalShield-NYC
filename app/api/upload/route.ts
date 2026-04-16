import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");

  // TODO: Persist uploads to Supabase storage or a signed upload flow.
  return NextResponse.json({
    ok: true,
    files: files.map((file, index) => ({
      id: `mock-upload-${index + 1}`,
      name: file instanceof File ? file.name : "unknown",
      accepted: file instanceof File,
    })),
    limits: {
      maxUploadFileCount: serverEnv.maxUploadFileCount,
      maxUploadFileSizeMb: serverEnv.maxUploadFileSizeMb,
    },
  });
}
