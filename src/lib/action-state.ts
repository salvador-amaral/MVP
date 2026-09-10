// Shared return shape for server actions consumed by useActionState forms.
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  /**
   * The action succeeded but something downstream did not — e.g. the request
   * was created while the invite email failed to send. Shown as a warning
   * toast so the user knows the side effect needs attention.
   */
  warning?: string;
  data?: unknown;
}

export const initialActionState: ActionState = {};
