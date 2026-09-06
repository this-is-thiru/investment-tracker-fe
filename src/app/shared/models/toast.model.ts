export type ToastType = "success" | "error" | "info" | "warn";

export interface Toast {
  message: string;
  type: ToastType;
}
