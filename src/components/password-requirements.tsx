import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordRequirementStates } from "@/lib/passwords";

export function PasswordRequirements({ password }: { password: string }) {
  const requirements = getPasswordRequirementStates(password);

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-700">Password requirements</p>
      <ul className="mt-2 space-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={cn(
              "flex items-center gap-2 text-xs",
              requirement.met ? "text-green-700" : "text-slate-500"
            )}
          >
            {requirement.met ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span>{requirement.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
