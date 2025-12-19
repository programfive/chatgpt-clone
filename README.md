# ChatGPT Clone (Next.js)

Clon de ChatGPT construido con **Next.js App Router**, **Clerk** para autenticación, **Prisma + PostgreSQL** para persistencia y **Cloudinary** para subida de archivos. Incluye chats de grupo mediante enlaces compartibles, chat temporal y soporte de adjuntos.

## Features

- **Chat UI estilo ChatGPT**
- **Textarea autosize** (Enter envía, Shift+Enter nueva línea)
- **Adjuntos con drag & drop** (react-dropzone) y múltiples archivos
- **Uploads** a Cloudinary (en chat normal)
- **Chat temporal** (no persiste conversación / adjuntos como base64 para el request)
- **Conversaciones** con historial
- **Chats de grupo** por enlace compartido (`SharedLink`) + flujo de join
- **Miembros** por conversación (`ConversationMember`)
- **Auth** con Clerk (`syncUser()`)

## Tech stack

- **Next.js 16 (Turbopack)** / React 19
- **Clerk** (Auth)
- **Prisma** + **PostgreSQL**
- **Cloudinary** (uploads)
- **TailwindCSS**

## Requisitos

- Node.js 18+ (recomendado 20+)
- Una base de datos PostgreSQL
- Cuenta de Clerk
- Cuenta de Cloudinary (para uploads)

## Instalación

1) Instala dependencias:

```bash
npm install
```

2) Crea tu archivo `.env` (no se versiona). Ejemplo de variables típicas que vas a necesitar:

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Opcional: URLs de redirect/host si lo usas en Clerk
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

3) Prisma: genera el cliente y aplica migraciones.

Si ya tienes migraciones en el repo:

```bash
npx prisma generate
npx prisma migrate deploy
```

Si estás en desarrollo y quieres crear la primera migración (solo la primera vez):

```bash
npx prisma migrate dev
```

4) Levanta el servidor:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

- `npm run dev` — modo desarrollo
- `npm run build` — build de producción
- `npm run start` — iniciar build
- `npm run lint` — lint

## Modelo de datos (Prisma)

- **User**: usuario sincronizado desde Clerk
- **Conversation**: chat (owner = `userId`)
- **SharedLink**: enlace único para compartir conversación (token único)
- **ConversationMember**: membresías para chats de grupo
- **Message**: mensajes por conversación
- **Upload**: adjuntos persistidos (Cloudinary)

Archivo: `prisma/schema.prisma`

## Endpoints principales (App Router)

- `POST /api/chat` — chat persistente
- `POST /api/chat/temporary` — chat temporal
- `GET /api/conversations` — lista de conversaciones
- `POST /api/upload` — upload multiple (multipart/form-data)
- `GET|POST|PATCH|DELETE /api/conversations/[id]/share` — gestionar enlace compartido
- `GET /join/[token]` — unirse a un grupo por token

## Notas

- La config `export const config` en routes App Router está deprecada/ignorada.
- Si ves warnings sobre `middleware` vs `proxy`, revisa la doc oficial de Next.js (cambios de convención).

## Licencia

Proyecto personal / educativo. Ajusta la licencia según tus necesidades.
