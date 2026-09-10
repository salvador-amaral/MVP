// Hand-written row types that mirror supabase/migrations. Regenerate the
// fully typed database client with `npm run db:types` against your project.

export type UserRole = "owner" | "admin" | "member";
export type RequestStatus = "draft" | "sent" | "in_progress" | "completed" | "expired";
export type RequestItemStatus = "pending" | "uploaded" | "accepted" | "rejected";
export type TemplateItemType = "file" | "text" | "number" | "checkbox";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  /** Optional Reply-To for client emails. Empty = platform default. */
  reply_to_email: string;
  reminder_settings: ReminderSettings;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettings {
  enabled: boolean;
  daysBefore: number[]; // e.g. [3, 1] → remind 3 and 1 day before due date
  everyDaysAfter: number; // e.g. 2 → remind every 2 days after due date
}

export interface StaffUser {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
  position: number;
  created_at: string;
}

export interface Request {
  id: string;
  organization_id: string;
  client_id: string;
  template_id: string;
  status: RequestStatus;
  due_date: string | null;
  magic_token: string;
  custom_message: string;
  expires_at: string | null;
  reminders_enabled: boolean;
  /** Last successful invite delivery. Null = never delivered. */
  invite_sent_at: string | null;
  /** Most recent delivery failure. Empty when the last send succeeded. */
  last_email_error: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RequestItem {
  id: string;
  request_id: string;
  template_item_id: string | null;
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
  status: RequestItemStatus;
  value: string | null;
  rejection_reason: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  request_item_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
}

export interface Reminder {
  id: string;
  request_id: string;
  type: "automatic" | "manual";
  channel: "email";
  sent_at: string;
  note: string;
  /** "failed" rows are kept as an audit trail and retried by the worker. */
  status: "sent" | "failed";
  error: string;
}

// --- enriched shapes used by UI -------------------------------------------------

export interface RequestWithRelations extends Request {
  client: { id: string; name: string; email: string };
  template: { id: string; name: string };
  _count?: {
    items: number;
    done: number;
  };
}

export interface RequestItemWithFiles extends RequestItem {
  files: UploadedFile[];
}
