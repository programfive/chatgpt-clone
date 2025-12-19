import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";
import { inferMimeType, uploadToCloudinary } from "@/services/claudinary";
import { isFileSizeValid, isFileTypeAllowed } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadIds: string[] = [];

    const createdUploads = [];
    for (const file of files) {
      const inferredType = inferMimeType(file);
      console.log(`Processing file: ${file.name}, type: ${file.type}, inferredType: ${inferredType}, size: ${file.size}`);

      // Validar tipo de archivo
      if (!isFileTypeAllowed(inferredType)) {
        console.error(`File type not allowed: ${inferredType}`);
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${inferredType}` },
          { status: 400 }
        );
      }

      // Validar tamaño de archivo
      if (!isFileSizeValid(file.size)) {
        console.error(`File too large: ${file.name}, size: ${file.size}`);
        return NextResponse.json(
          { error: `Archivo demasiado grande: ${file.name}. Máximo 10MB` },
          { status: 400 }
        );
      }

      const uploadResult = await uploadToCloudinary(file);
      console.log(`Cloudinary upload successful. Public ID: ${uploadResult.publicId}`);

      console.log(`Creating database record...`);
      const uploadRecord = await db.upload.create({
        data: {
          messageId: null,
          url: uploadResult.url,
          folder: uploadResult.folder,
          resourceType: uploadResult.resourceType,
          fileName: file.name,
          publicId: uploadResult.publicId,
        },
      });
      console.log(`Database record created. Upload ID: ${uploadRecord.id}`);

      uploadIds.push(uploadRecord.id);
      createdUploads.push({
        id: uploadRecord.id,
        url: uploadRecord.url,
        folder: uploadRecord.folder,
        resourceType: uploadRecord.resourceType,
        fileName: uploadRecord.fileName,
        publicId: uploadRecord.publicId,
      });
    }

    return NextResponse.json({ uploadIds, uploads: createdUploads });
  } catch (error) {
    console.error("Upload error:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to upload files";
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
