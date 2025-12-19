import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";
import { EphemeralUploadInput, processEphemeralUploadsForChat, processUploadsForChat, formatMessageWithFiles } from "@/lib/fileProcessor";


type ChatMode = 'normal' | 'image' | 'think' | 'research' | 'shopping';

const GUEST_COOKIE_NAME = 'guest_chat_sessions';
const GUEST_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function buildSetCookie(value: string) {
  return `${GUEST_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`;
}

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  normal: "Eres un asistente útil y amigable. Responde de manera clara y concisa.",
  image: "Eres un asistente especializado en crear descripciones detalladas para generar imágenes. Cuando el usuario te pida crear una imagen, genera una descripción detallada en inglés (prompt) que podría usarse con DALL-E u otro generador de imágenes. Incluye detalles sobre estilo, colores, composición, iluminación y ambiente. Responde primero con la descripción en inglés y luego explica en español lo que describes.",
  think: "Eres un asistente que piensa paso a paso. Antes de dar una respuesta final, analiza el problema desde diferentes ángulos, considera múltiples perspectivas y razona de forma explícita. Muestra tu proceso de pensamiento de manera estructurada usando encabezados como 'Análisis:', 'Consideraciones:', 'Conclusión:'.",
  research: "Eres un asistente de investigación avanzada. Proporciona respuestas exhaustivas y bien documentadas. Estructura tu respuesta con secciones claras, incluye múltiples fuentes de información cuando sea posible, presenta diferentes perspectivas sobre el tema y ofrece un análisis profundo. Usa formato markdown para mejor legibilidad.",
  shopping: "Eres un asistente de compras experto. Ayuda al usuario a encontrar los mejores productos, compara opciones, sugiere alternativas y proporciona consejos de compra. Considera factores como precio, calidad, reseñas y relación calidad-precio. Organiza las recomendaciones de forma clara con pros y contras cuando sea relevante.",
};

export async function POST(req: Request) {
  try {
    const user = await syncUser();

    const { messages, newMessage, model, mode = 'normal', uploadIds, ephemeralUploads } = await req.json();

    if (!Array.isArray(messages) || typeof newMessage !== "string") {
      return new Response("Payload inválido", { status: 400 });
    }

    const isGuest = !user;

    if (isGuest) {
      const hasUploadIds = Array.isArray(uploadIds) && uploadIds.length > 0;
      const hasEphemeralUploads = Array.isArray(ephemeralUploads) && ephemeralUploads.length > 0;
      if (hasUploadIds || hasEphemeralUploads) {
        return new Response("Archivos no permitidos para usuarios no registrados", { status: 403 });
      }

      const cookieHeader = req.headers.get('cookie');
      const cookies = parseCookieHeader(cookieHeader);

      let state: { start: number; count: number } = { start: Date.now(), count: 0 };
      const raw = cookies[GUEST_COOKIE_NAME];
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { start?: unknown; count?: unknown };
          const start = typeof parsed.start === 'number' ? parsed.start : Date.now();
          const count = typeof parsed.count === 'number' ? parsed.count : 0;
          state = { start, count };
        } catch {
          state = { start: Date.now(), count: 0 };
        }
      }

      const now = Date.now();
      if (now - state.start >= WINDOW_MS) {
        state = { start: now, count: 0 };
      }

      // Count a "conversation" when user sends the first message of a new temporary chat
      // (i.e., messages array is empty)
      if (messages.length === 0) {
        if (state.count >= GUEST_LIMIT) {
          return new Response(
            JSON.stringify({ error: `Límite alcanzado: ${GUEST_LIMIT} conversaciones cada 24 horas.` }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
        state.count += 1;
      }

      // Persist updated state for the remainder of the window
      const setCookie = buildSetCookie(JSON.stringify(state));
      // We can't early-return here because we still need to stream the model response.
      // We'll attach Set-Cookie header to the streaming response below.

      const systemPrompt = SYSTEM_PROMPTS[mode as ChatMode] || SYSTEM_PROMPTS.normal;
      const updatedMessages = [
        ...messages,
        {
          role: 'user',
          content: newMessage,
        },
      ];

      const result = streamText({
        model: openai(model || 'gpt-4o-mini'),
        system: systemPrompt,
        messages: updatedMessages,
      });

      const streamResponse = result.toTextStreamResponse();
      return new Response(streamResponse.body, {
        status: streamResponse.status,
        headers: {
          ...Object.fromEntries(streamResponse.headers.entries()),
          'Set-Cookie': setCookie,
        },
      });
    }

    const uploads = uploadIds && Array.isArray(uploadIds) && uploadIds.length > 0
      ? await db.upload.findMany({
          where: { id: { in: uploadIds } },
        })
      : [];

    const processedFromDb = uploads.length > 0 ? await processUploadsForChat(uploads) : [];

    const ephemeralArray: EphemeralUploadInput[] = Array.isArray(ephemeralUploads) ? ephemeralUploads : [];
    const processedFromEphemeral = ephemeralArray.length > 0 ? await processEphemeralUploadsForChat(ephemeralArray) : [];

    const processedFiles = [...processedFromDb, ...processedFromEphemeral];

    const userMessageContent = formatMessageWithFiles(newMessage, processedFiles);

    const updatedMessages = [
      ...messages,
      {
        role: 'user',
        content: userMessageContent,
      },
    ];

    const systemPrompt = SYSTEM_PROMPTS[mode as ChatMode] || SYSTEM_PROMPTS.normal;

    const hasImages = processedFiles.some((f) => f.type === 'image');
    const modelToUse = hasImages ? 'gpt-4o' : (model || 'gpt-4o-mini');

    const result = streamText({
      model: openai(modelToUse),
      system: systemPrompt,
      messages: updatedMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error en chat temporal API:", error);
    return new Response(
      JSON.stringify({ error: "Error procesando la solicitud" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
