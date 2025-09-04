import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
        </div>
        <style jsx>{`
          input:checked {
            background-color: #3b82f6;
            border-color: #3b82f6;
          }
        `}</style>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
