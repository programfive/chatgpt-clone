import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const upload = await db.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    console.log("Download request for upload:", {
      id: upload.id,
      url: upload.url,
      fileName: upload.fileName,
      resourceType: upload.resourceType,
    });

    // Fetch the file from Cloudinary
    const fileResponse = await fetch(upload.url);
    console.log("Cloudinary response status:", fileResponse.status);
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error("Cloudinary fetch failed:", errorText);
      return NextResponse.json(
        { error: "No se pudo obtener el archivo", details: errorText },
        { status: 502 }
      );
    }

    const blob = await fileResponse.blob();

    // Return with download headers
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(upload.fileName)}"`,
        "Content-Length": blob.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Error al descargar el archivo" },
      { status: 500 }
    );
  }
}
