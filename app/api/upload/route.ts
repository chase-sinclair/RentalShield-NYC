import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";
import { stageUploadedFiles } from "@/lib/uploads/staging";
import { uploadSchema } from "@/lib/utils/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");

  if (!files.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Add at least one screenshot to upload.",
      },
      { status: 400 },
    );
  }

  if (files.length > serverEnv.maxUploadFileCount) {
    return NextResponse.json(
      {
        ok: false,
        error: `Upload up to ${serverEnv.maxUploadFileCount} screenshots at a time.`,
      },
      { status: 400 },
    );
  }

  const validatedFiles: File[] = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "One of the uploaded items was not a valid file.",
        },
        { status: 400 },
      );
    }

    const parsed = uploadSchema.safeParse({
      name: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.flatten().formErrors[0] ??
            Object.values(parsed.error.flatten().fieldErrors)
              .flat()
              .filter(Boolean)[0] ??
            "One of the screenshots did not pass validation.",
        },
        { status: 400 },
      );
    }

    validatedFiles.push(file);
  }

  const stagedAssets = await stageUploadedFiles(validatedFiles);

  return NextResponse.json({
    ok: true,
    files: stagedAssets,
    limits: {
      maxUploadFileCount: serverEnv.maxUploadFileCount,
      maxUploadFileSizeMb: serverEnv.maxUploadFileSizeMb,
    },
    notes: [
      "Screenshots are validated server-side and staged temporarily for immediate analysis.",
      "Image bytes are available to the Bedrock multimodal pipeline during the current submission flow.",
    ],
  });
}
