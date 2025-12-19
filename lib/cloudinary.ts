import { v2 as cloudinary } from 'cloudinary';

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Carpeta base para todos los archivos del proyecto
export const BASE_FOLDER = 'chatgpt-clone';

// Tipos de recursos permitidos
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'text/markdown',
];

export const ALLOWED_FILE_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
];

// Tamaño máximo de archivo: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Determina la carpeta de Cloudinary según el tipo de archivo
 */
export function getFolderForFile(fileType: string): string {
    if (ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return `${BASE_FOLDER}/imagenes`;
    }
    if (ALLOWED_VIDEO_TYPES.includes(fileType)) {
        return `${BASE_FOLDER}/videos`;
    }
    return `${BASE_FOLDER}/archivos`;
}

/**
 * Determina el resource type de Cloudinary según el tipo de archivo
 */
export function getResourceType(fileType: string): 'image' | 'video' | 'raw' {
    if (ALLOWED_IMAGE_TYPES.includes(fileType)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(fileType)) return 'video';
    return 'raw';
}

/**
 * Valida si un archivo es permitido
 */
export function isFileTypeAllowed(fileType: string): boolean {
    return ALLOWED_FILE_TYPES.includes(fileType);
}

/**
 * Valida si el tamaño del archivo está dentro del límite
 */
export function isFileSizeValid(fileSize: number): boolean {
    return fileSize <= MAX_FILE_SIZE;
}

/**
 * Formatea el tamaño de archivo a formato legible
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default cloudinary;
