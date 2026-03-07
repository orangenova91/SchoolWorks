"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-yellow-500 text-black",
  };

  const textColor = toast.type === "warning" ? "text-black" : "text-white";

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-md",
        styles[toast.type]
      )}
      role="alert"
      aria-live="assertive"
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className={cn(
          "ml-4 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-white rounded",
          textColor
        )}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, showToast, removeToast };
}

