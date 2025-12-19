import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";
import { processUploadsForChat, formatMessageWithFiles } from "@/lib/fileProcessor";


const TITLE_MAX_LENGTH = 80;

type ChatMode = 'normal' | 'image' | 'think' | 'research' | 'shopping';

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  normal: "Eres un asistente útil y amigable. Responde de manera clara y concisa.",
  image: "Eres un asistente especializado en crear descripciones detalladas para generar imágenes. Cuando el usuario te pida crear una imagen, genera una descripción detallada en inglés (prompt) que podría usarse con DALL-E u otro generador de imágenes. Incluye detalles sobre estilo, colores, composición, iluminación y ambiente. Responde primero con la descripción en inglés y luego explica en español lo que describes.",
  think: "Eres un asistente que piensa paso a paso. Antes de dar una respuesta final, analiza el problema desde diferentes ángulos, considera múltiples perspectivas y razona de forma explícita. Muestra tu proceso de pensamiento de manera estructurada usando encabezados como 'Análisis:', 'Consideraciones:', 'Conclusión:'.",
  research: "Eres un asistente de investigación avanzada. Proporciona respuestas exhaustivas y bien documentadas. Estructura tu respuesta con secciones claras, incluye múltiples fuentes de información cuando sea posible, presenta diferentes perspectivas sobre el tema y ofrece un análisis profundo. Usa formato markdown para mejor legibilidad.",
  shopping: "Eres un asistente de compras experto. Ayuda al usuario a encontrar los mejores productos, compara opciones, sugiere alternativas y proporciona consejos de compra. Considera factores como precio, calidad, reseñas y relación calidad-precio. Organiza las recomendaciones de forma clara con pros y contras cuando sea relevante.",
};

async function accumulateStream(
  stream: ReadableStream<Uint8Array>,
  assistantMessageId: string,
  conversationId: string,
  existingTitle: string | null
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += decoder.decode(value, { stream: true });
    }

    await db.message.update({
      where: { id: assistantMessageId },
      data: { content: assistantContent },
    });

    if (!existingTitle && assistantContent) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { title: assistantContent.slice(0, TITLE_MAX_LENGTH) },
      });
    }
  } catch (error) {
    console.error("Error guardando respuesta del asistente:", error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await syncUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { conversationId, messages, newMessage, model, mode = 'normal', uploadIds } = await req.json();

    if (!Array.isArray(messages) || typeof newMessage !== "string") {
      return new Response("Payload inválido", { status: 400 });
    }

    const snippet =
      newMessage.trim().slice(0, TITLE_MAX_LENGTH) || "Chat sin título";

    let conversation = null;
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { userId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: snippet,
        },
      });
    }

    const userMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        authorId: user.id,
        role: "user",
        content: newMessage,
      },
    });

    // Asociar uploads si existen
    if (uploadIds && Array.isArray(uploadIds) && uploadIds.length > 0) {
      await db.upload.updateMany({
        where: {
          id: { in: uploadIds },
        },
        data: {
          messageId: userMessage.id,
        },
      });
    }

    // Obtener los uploads para procesarlos
    const uploads = uploadIds && uploadIds.length > 0
      ? await db.upload.findMany({
        where: { messageId: userMessage.id },
      })
      : [];

    // Procesar archivos subidos (extraer texto de PDFs, etc.)
    const processedFiles = uploads.length > 0
      ? await processUploadsForChat(uploads)
      : [];

    // Debug: ver qué archivos se procesaron
    if (processedFiles.length > 0) {
      console.log('Archivos procesados:', processedFiles.map(f => ({
        type: f.type,
        fileName: f.fileName,
        hasBase64: !!f.base64,
        hasUrl: !!f.url,
        textLength: f.text?.length
      })));
    }

    // Formatear el mensaje del usuario con los archivos procesados
    const userMessageContent = formatMessageWithFiles(newMessage, processedFiles);

    // Debug: ver formato del mensaje
    if (processedFiles.length > 0) {
      console.log('Formato mensaje:', typeof userMessageContent === 'string' 
        ? 'texto simple' 
        : `multimodal con ${(userMessageContent as unknown[]).length} partes`);
    }

    // Determinar si hay imágenes para usar el modelo adecuado
    const hasImages = processedFiles.some(f => f.type === 'image');

    // Clonar los mensajes anteriores y agregar el nuevo mensaje del usuario
    const updatedMessages = [
      ...messages,
      {
        role: 'user',
        content: userMessageContent,
      },
    ];

    const assistantMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: "",
      },
    });

    const systemPrompt = SYSTEM_PROMPTS[mode as ChatMode] || SYSTEM_PROMPTS.normal;

    // Usar gpt-4o si hay imágenes, gpt-4o-mini en caso contrario
    const modelToUse = hasImages ? 'gpt-4o' : (model || 'gpt-4o-mini');

    const result = streamText({
      model: openai(modelToUse),
      system: systemPrompt,
      messages: updatedMessages,
    });


    const streamResponse = result.toTextStreamResponse();
    const responseBody = streamResponse.body;

    if (responseBody) {
      const [bodyForClient, bodyForStorage] = responseBody.tee();

      accumulateStream(
        bodyForStorage,
        assistantMessage.id,
        conversation.id,
        conversation.title
      );

      return new Response(bodyForClient, {
        status: streamResponse.status,
        headers: {
          ...Object.fromEntries(streamResponse.headers.entries()),
          "x-conversation-id": conversation.id,
        },
      });
    }

    await db.message.update({
      where: { id: assistantMessage.id },
      data: { content: "" },
    });

    return new Response("No se pudo iniciar el stream", { status: 502 });
  } catch (error) {
    console.error("Error en chat API:", error);
    return new Response(
      JSON.stringify({ error: "Error procesando la solicitud" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
