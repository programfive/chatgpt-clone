import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ProcessedFile {
    type: 'image' | 'document' | 'video';
    url?: string;
    base64?: string;
    mimeType?: string;
    text?: string;
    fileName: string;
}

export interface EphemeralUploadInput {
    fileName: string;
    resourceType: 'image' | 'video' | 'raw';
    mimeType: string;
    base64: string;
}

const MAX_TEXT_LENGTH = 15000;

/**
 * Descarga un archivo desde una URL y retorna el Buffer
 */
async function downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Extrae texto de un PDF usando unpdf
 */
async function extractTextFromPdf(url: string): Promise<string> {
    try {
        const buffer = await downloadFile(url);
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        const cleanText = text.trim();
        return cleanText.slice(0, MAX_TEXT_LENGTH) || 'PDF vacío o sin texto extraíble';
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return 'Error al extraer texto del PDF';
    }
}

/**
 * Extrae texto de un documento Word (.docx) usando mammoth
 */
async function extractTextFromWord(url: string): Promise<string> {
    try {
        const buffer = await downloadFile(url);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.trim();
        return text.slice(0, MAX_TEXT_LENGTH) || 'Documento Word vacío';
    } catch (error) {
        console.error('Error extracting Word text:', error);
        return 'Error al extraer texto del documento Word';
    }
}

/**
 * Extrae texto de un archivo Excel (.xlsx, .xls) usando xlsx
 */
async function extractTextFromExcel(url: string): Promise<string> {
    try {
        const buffer = await downloadFile(url);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        let fullText = '';
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            fullText += `--- Hoja: ${sheetName} ---\n${csv}\n\n`;
        }
        
        return fullText.trim().slice(0, MAX_TEXT_LENGTH) || 'Excel vacío';
    } catch (error) {
        console.error('Error extracting Excel text:', error);
        return 'Error al extraer texto del archivo Excel';
    }
}

/**
 * Extrae texto de un archivo de texto plano
 */
async function extractTextFromUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        return text.slice(0, MAX_TEXT_LENGTH) || 'Archivo vacío';
    } catch (error) {
        console.error('Error extracting text:', error);
        return 'Error al leer el archivo de texto';
    }
}

/**
 * Convierte una imagen a base64 desde su URL
 */
async function imageToBase64(url: string, fileName: string): Promise<{ base64: string; mimeType: string }> {
    try {
        const buffer = await downloadFile(url);
        const base64 = buffer.toString('base64');
        
        const ext = fileName.toLowerCase().split('.').pop() || 'png';
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
        };
        const mimeType = mimeTypes[ext] || 'image/png';
        
        return { base64, mimeType };
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

/**
 * Determina si un archivo es una imagen basándose en el resourceType
 */
function isImage(resourceType: string): boolean {
    return resourceType === 'image';
}

/**
 * Determina si un archivo es un video basándose en el resourceType
 */
function isVideo(resourceType: string): boolean {
    return resourceType === 'video';
}

/**
 * Determina si un archivo es un documento (PDF, Word, etc.)
 */
function isDocument(resourceType: string): boolean {
    return resourceType === 'raw';
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        const cleanText = text.trim();
        return cleanText.slice(0, MAX_TEXT_LENGTH) || 'PDF vacío o sin texto extraíble';
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return 'Error al extraer texto del PDF';
    }
}

async function extractTextFromWordBuffer(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.trim();
        return text.slice(0, MAX_TEXT_LENGTH) || 'Documento Word vacío';
    } catch (error) {
        console.error('Error extracting Word text:', error);
        return 'Error al extraer texto del documento Word';
    }
}

async function extractTextFromExcelBuffer(buffer: Buffer): Promise<string> {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let fullText = '';
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            fullText += `--- Hoja: ${sheetName} ---\n${csv}\n\n`;
        }

        return fullText.trim().slice(0, MAX_TEXT_LENGTH) || 'Excel vacío';
    } catch (error) {
        console.error('Error extracting Excel text:', error);
        return 'Error al extraer texto del archivo Excel';
    }
}

function extractTextFromPlainBuffer(buffer: Buffer): string {
    try {
        const text = buffer.toString('utf8');
        return text.slice(0, MAX_TEXT_LENGTH) || 'Archivo vacío';
    } catch (error) {
        console.error('Error extracting text:', error);
        return 'Error al leer el archivo de texto';
    }
}

/**
 * Procesa un array de uploads para incluirlos en el chat con OpenAI
 * - Imágenes: se convierten a base64 para GPT-4 Vision
 * - PDFs: se extrae el texto con pdf-parse
 * - Word (.docx): se extrae el texto con mammoth
 * - Excel (.xlsx, .xls): se extrae el texto con xlsx
 * - Archivos de texto (.txt, .csv, .md): se lee el contenido directamente
 * - Otros documentos: se indica que están adjuntos
 */
export async function processUploadsForChat(
    uploads: Array<{
        url: string;
        resourceType: string;
        fileName: string;
        folder: string;
    }>
): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    for (const upload of uploads) {
        const fileNameLower = upload.fileName.toLowerCase();

        if (isImage(upload.resourceType)) {
            // Convertir imágenes a base64 para GPT-4 Vision
            try {
                const { base64, mimeType } = await imageToBase64(upload.url, upload.fileName);
                processedFiles.push({
                    type: 'image',
                    base64,
                    mimeType,
                    fileName: upload.fileName,
                });
            } catch {
                // Fallback a URL si falla la conversión
                processedFiles.push({
                    type: 'image',
                    url: upload.url,
                    fileName: upload.fileName,
                });
            }
        } else if (isDocument(upload.resourceType)) {
            // PDF: extraer texto con pdf-parse
            if (fileNameLower.endsWith('.pdf')) {
                const text = await extractTextFromPdf(upload.url);
                processedFiles.push({
                    type: 'document',
                    text,
                    fileName: upload.fileName,
                });
            }
            // Word (.docx): extraer texto con mammoth
            else if (fileNameLower.endsWith('.docx')) {
                const text = await extractTextFromWord(upload.url);
                processedFiles.push({
                    type: 'document',
                    text,
                    fileName: upload.fileName,
                });
            }
            // Excel (.xlsx, .xls): extraer texto con xlsx
            else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
                const text = await extractTextFromExcel(upload.url);
                processedFiles.push({
                    type: 'document',
                    text,
                    fileName: upload.fileName,
                });
            }
            // Archivos de texto plano
            else if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.json')) {
                const text = await extractTextFromUrl(upload.url);
                processedFiles.push({
                    type: 'document',
                    text,
                    fileName: upload.fileName,
                });
            }
            // Word antiguo (.doc) - no soportado por mammoth
            else if (fileNameLower.endsWith('.doc')) {
                processedFiles.push({
                    type: 'document',
                    text: `📎 Archivo adjunto: ${upload.fileName}\n(Formato .doc antiguo no soportado. Por favor, conviértelo a .docx)`,
                    fileName: upload.fileName,
                });
            }
            // Otros documentos no soportados
            else {
                processedFiles.push({
                    type: 'document',
                    text: `📎 Archivo adjunto: ${upload.fileName}\n(Formato no soportado para lectura automática)`,
                    fileName: upload.fileName,
                });
            }
        } else if (isVideo(upload.resourceType)) {
            // Los videos no se pueden procesar directamente con la API actual
            processedFiles.push({
                type: 'video',
                text: `🎬 Video adjunto: ${upload.fileName} (URL: ${upload.url})`,
                fileName: upload.fileName,
            });
        }
    }

    return processedFiles;
}

export async function processEphemeralUploadsForChat(
    uploads: EphemeralUploadInput[]
): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    for (const upload of uploads) {
        const fileNameLower = upload.fileName.toLowerCase();
        const buffer = Buffer.from(upload.base64, 'base64');

        if (upload.resourceType === 'image') {
            processedFiles.push({
                type: 'image',
                base64: upload.base64,
                mimeType: upload.mimeType || 'image/png',
                fileName: upload.fileName,
            });
            continue;
        }

        if (upload.resourceType === 'video') {
            processedFiles.push({
                type: 'video',
                text: `🎬 Video adjunto: ${upload.fileName}`,
                fileName: upload.fileName,
            });
            continue;
        }

        if (fileNameLower.endsWith('.pdf')) {
            const text = await extractTextFromPdfBuffer(buffer);
            processedFiles.push({ type: 'document', text, fileName: upload.fileName });
        } else if (fileNameLower.endsWith('.docx')) {
            const text = await extractTextFromWordBuffer(buffer);
            processedFiles.push({ type: 'document', text, fileName: upload.fileName });
        } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
            const text = await extractTextFromExcelBuffer(buffer);
            processedFiles.push({ type: 'document', text, fileName: upload.fileName });
        } else if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.json')) {
            const text = extractTextFromPlainBuffer(buffer);
            processedFiles.push({ type: 'document', text, fileName: upload.fileName });
        } else if (fileNameLower.endsWith('.doc')) {
            processedFiles.push({
                type: 'document',
                text: `📎 Archivo adjunto: ${upload.fileName}\n(Formato .doc antiguo no soportado. Por favor, conviértelo a .docx)`,
                fileName: upload.fileName,
            });
        } else {
            processedFiles.push({
                type: 'document',
                text: `📎 Archivo adjunto: ${upload.fileName}\n(Formato no soportado para lectura automática)`,
                fileName: upload.fileName,
            });
        }
    }

    return processedFiles;
}

/**
 * Tipo para contenido multimodal compatible con Vercel AI SDK
 */
type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string };
type ContentPart = TextPart | ImagePart;

/**
 * Formatea el contenido del mensaje incluyendo archivos procesados
 * Soporta imágenes en base64 y URLs - Compatible con Vercel AI SDK
 */
export function formatMessageWithFiles(
    textContent: string,
    processedFiles: ProcessedFile[]
): string | ContentPart[] {
    const hasImages = processedFiles.some(f => f.type === 'image');

    if (!hasImages) {
        // Si no hay imágenes, concatenamos todo como texto
        let fullText = textContent;

        for (const file of processedFiles) {
            if (file.type === 'document' && file.text) {
                fullText += `\n\n--- Contenido de ${file.fileName} ---\n${file.text}`;
            } else if (file.type === 'video' && file.text) {
                fullText += `\n\n${file.text}`;
            }
        }

        return fullText;
    }

    // Si hay imágenes, usamos formato multimodal de Vercel AI SDK
    const content: ContentPart[] = [];

    // Agregar texto del mensaje
    let fullText = textContent;

    // Agregar contenido de documentos al texto
    for (const file of processedFiles) {
        if (file.type === 'document' && file.text) {
            fullText += `\n\n--- Contenido de ${file.fileName} ---\n${file.text}`;
        } else if (file.type === 'video' && file.text) {
            fullText += `\n\n${file.text}`;
        }
    }

    content.push({ type: 'text', text: fullText });

    // Agregar imágenes en formato Vercel AI SDK
    for (const file of processedFiles) {
        if (file.type === 'image') {
            if (file.base64 && file.mimeType) {
                // Imagen en base64 - formato data URL
                content.push({
                    type: 'image',
                    image: `data:${file.mimeType};base64,${file.base64}`,
                });
            } else if (file.url) {
                // URL directa
                content.push({
                    type: 'image',
                    image: file.url,
                });
            }
        }
    }

    return content;
}
