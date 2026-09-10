// Shared return shape for server actions consumed by useActionState forms.
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

export const initialActionState: ActionState = {};
