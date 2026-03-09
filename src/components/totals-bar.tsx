"use client";

import { TIME_SLOTS } from "@/lib/constants";

export function TotalsBar({
  inShed,
  rowing,
}: {
  inShed: Record<number, number>;
  rowing: Record<number, number>;
}) {
  // Calculate peak values for mobile summary
  const peakShed = Math.max(...TIME_SLOTS.map((ts) => inShed[ts.slot]));
  const peakRowing = Math.max(...TIME_SLOTS.map((ts) => rowing[ts.slot]));

  return (
    <>
      {/* Mobile summary */}
      <div className="md:hidden flex gap-3 text-sm">
        <div className="flex-1 rounded-lg border bg-orange-50 px-3 py-2">
          <div className="text-xs text-muted-foreground font-medium">Peak in shed</div>
          <div className={`text-lg font-bold ${peakShed > 30 ? "text-red-600" : peakShed > 20 ? "text-amber-600" : "text-gray-900"}`}>
            {peakShed}
          </div>
        </div>
        <div className="flex-1 rounded-lg border bg-blue-50 px-3 py-2">
          <div className="text-xs text-muted-foreground font-medium">Peak rowing</div>
          <div className="text-lg font-bold text-gray-900">{peakRowing}</div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto rounded-lg border bg-white hidden md:block">
        <table className="w-full text-sm">
          <tbody>
            <tr className="bg-orange-50 border-b">
              <td className="sticky left-0 z-10 bg-orange-50 px-3 py-1.5 font-semibold w-48">
                TOTAL IN SHED
              </td>
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
    </>
  );
}
