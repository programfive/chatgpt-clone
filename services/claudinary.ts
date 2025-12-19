const FOLDER_TYPES = {
  IMAGE: "images",
  VIDEO: "videos",
  DOCUMENT: "documents",
} as const;

type FileCategory = "image" | "video" | "document";
type ResourceType = "image" | "video" | "raw";

interface CloudinaryUploadResponse {
  name: string;
  url: string;
  publicId: string;
  resourceType: ResourceType;
  size: number;
  folder: string;
}

interface CloudinaryApiResponse {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  resource_type: string;
}

export const inferMimeType = (file: File): string => {
  if (file.type && file.type.trim().length > 0) return file.type;

  const name = file.name || "";
  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
  if (!ext) return "application/octet-stream";

  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (["png"].includes(ext)) return "image/png";
  if (["gif"].includes(ext)) return "image/gif";
  if (["webp"].includes(ext)) return "image/webp";
  if (["svg"].includes(ext)) return "image/svg+xml";

  if (["mp4"].includes(ext)) return "video/mp4";
  if (["webm"].includes(ext)) return "video/webm";
  if (["mov"].includes(ext)) return "video/quicktime";

  if (["pdf"].includes(ext)) return "application/pdf";
  if (["txt"].includes(ext)) return "text/plain";
  if (["csv"].includes(ext)) return "text/csv";
  if (["md", "markdown"].includes(ext)) return "text/markdown";
  if (["doc"].includes(ext)) return "application/msword";
  if (["docx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (["ppt"].includes(ext)) return "application/vnd.ms-powerpoint";
  if (["pptx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (["xls"].includes(ext)) return "application/vnd.ms-excel";
  if (["xlsx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return "application/octet-stream";
};

const getFileCategory = (file: File): FileCategory => {
  const mime = inferMimeType(file);
  if (mime.startsWith("image/")) {
    return "image";
  } else if (mime.startsWith("video/")) {
    return "video";
  }

  return "document";
};

const getFolderPath = (category: FileCategory, conversationId?: string) => {
  const baseFolder = "chat-uploads";
  const typeFolder = FOLDER_TYPES[category.toUpperCase() as keyof typeof FOLDER_TYPES];

  if (conversationId) {
    return `${baseFolder}/${typeFolder}/${conversationId}`;
  }

  return `${baseFolder}/${typeFolder}`;
};

export const uploadToCloudinary = async (file: File, conversationId?: string): Promise<CloudinaryUploadResponse> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials not configured");
  }

  const category = getFileCategory(file);
  const folder = getFolderPath(category, conversationId);
  const resourceType: ResourceType = category === "document" ? "raw" : category;
  const mimeType = inferMimeType(file);

  // Convertir archivo a base64 data URI
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Data}`;

  const timestamp = Math.floor(Date.now() / 1000);

  // Generar firma con parámetros ordenados alfabéticamente
  const normalizedFileName = file.name.replace(/[\\/]/g, "_");

  const paramsToSign = {
    display_name: normalizedFileName,
    folder,
    timestamp: timestamp.toString(),
    unique_filename: "true",
    use_filename: "true",
  };

  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
    .join("&");

  const signature = await generateSHA1(`${signatureBase}${apiSecret}`);

  // Crear body como URLSearchParams para enviar como form-urlencoded
  const body = new URLSearchParams();
  body.append("file", dataUri);
  body.append("api_key", apiKey);
  body.append("timestamp", timestamp.toString());
  body.append("signature", signature);
  body.append("folder", folder);
  body.append("use_filename", "true");
  body.append("unique_filename", "true");
  body.append("display_name", normalizedFileName);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Cloudinary upload error:", errorData);
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorData}`);
  }

  const result: CloudinaryApiResponse = await response.json();

  return {
    name: file.name,
    url: result.secure_url,
    publicId: result.public_id,
    resourceType,
    size: file.size,
    folder,
  };
};

async function generateSHA1(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}