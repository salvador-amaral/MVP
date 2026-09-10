import { z } from "zod";

// ---- shared ----
export const emailSchema = z.string().trim().email("Introduza um email válido");
export const requiredText = z.string().trim().min(1, "Campo obrigatório");

// ---- auth ----
export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Indique o seu nome"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
  organizationName: z
    .string()
    .trim()
    .min(2, "Indique o nome do seu escritório/empresa"),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Indique a sua palavra-passe"),
});

// ---- clients ----
export const clientSchema = z.object({
  name: requiredText.max(200),
  email: emailSchema,
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

// ---- templates ----
const templateItemSchema = z.object({
  title: requiredText.max(200),
  description: z.string().trim().max(1000).optional().default(""),
  type: z.enum(["file", "text", "number", "checkbox"]),
  is_required: z.boolean(),
});

export const templateSchema = z.object({
  name: requiredText.max(200),
  description: z.string().trim().max(2000).optional().default(""),
  items: z.array(templateItemSchema).min(1, "Adicione pelo menos um item"),
});

// ---- requests ----
export const requestSchema = z.object({
  clientId: z.string().uuid(),
  templateId: z.string().uuid(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  customMessage: z.string().trim().max(4000).optional().default(""),
  remindersEnabled: z.boolean().optional().default(true),
});

// ---- request item (accept/reject) ----
export const reviewItemSchema = z.object({
  requestItemId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
  rejectionReason: z.string().trim().max(1000).optional().default(""),
});

// ---- settings ----
export const orgSettingsSchema = z.object({
  name: requiredText.max(200),
  reminderSettings: z.object({
    enabled: z.boolean(),
    daysBefore: z.array(z.number().min(0).max(60)),
    everyDaysAfter: z.number().min(1).max(60),
  }),
});

// ---- team invites ----
export const inviteSchema = z.object({
  fullName: z.string().trim().min(1, "Indique o nome da pessoa").max(200),
  email: emailSchema,
  role: z.enum(["member", "admin"]),
});
