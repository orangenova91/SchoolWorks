"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = "text", readOnly, required, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const ariaRequired = props["aria-required"];
    const isRequired =
      typeof required === "boolean"
        ? required
        : ariaRequired === true || ariaRequired === "true";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          readOnly={readOnly}
          required={required}
          className={cn(
            "flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            readOnly || props.disabled
              ? "bg-gray-100 text-gray-700 cursor-not-allowed" 
              : "bg-white",
            props.disabled && "opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

