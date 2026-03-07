"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, required, placeholder, disabled, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substring(7)}`;
    const ariaRequired = props["aria-required"];
    const isRequired =
      typeof required === "boolean"
        ? required
        : ariaRequired === true || ariaRequired === "true";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            disabled
              ? "bg-gray-100 text-gray-700 cursor-not-allowed"
              : "bg-white text-gray-900",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p
            id={`${selectId}-error`}
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

Select.displayName = "Select";

