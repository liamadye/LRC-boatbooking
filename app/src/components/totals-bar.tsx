"use client";

import { TIME_SLOTS } from "@/lib/constants";

export function TotalsBar({
  inShed,
  rowing,
}: {
  inShed: Record<number, number>;
  rowing: Record<number, number>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <tbody>
          <tr className="bg-orange-50 border-b">
            <td className="sticky left-0 z-10 bg-orange-50 px-3 py-1.5 font-semibold w-48">
              TOTAL IN SHED
            </td>
            <td className="w-20" />
            <td className="w-16" />
            <td className="w-28" />
            {TIME_SLOTS.map((ts) => (
              <td
                key={ts.slot}
                className="px-2 py-1.5 text-center font-bold min-w-[110px]"
              >
                <span
                  className={
                    inShed[ts.slot] > 30
                      ? "text-red-600"
                      : inShed[ts.slot] > 20
                        ? "text-amber-600"
                        : "text-gray-900"
                  }
                >
                  {inShed[ts.slot]}
                </span>
              </td>
            ))}
          </tr>
          <tr className="bg-blue-50">
            <td className="sticky left-0 z-10 bg-blue-50 px-3 py-1.5 font-semibold w-48">
              TOTAL ROWING
            </td>
            <td className="w-20" />
            <td className="w-16" />
            <td className="w-28" />
            {TIME_SLOTS.map((ts) => (
              <td
                key={ts.slot}
                className="px-2 py-1.5 text-center font-bold min-w-[110px]"
              >
                {rowing[ts.slot]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
