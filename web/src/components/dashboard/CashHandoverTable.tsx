"use client";

import { useMemo, useState } from "react";

import { CashHandover, Driver } from "@/lib/types";

const statusStyles: Record<CashHandover["status"], string> = {
  pending: "bg-amber-500/20 text-amber-200",
  approved: "bg-emerald-500/20 text-emerald-200",
  rejected: "bg-rose-500/20 text-rose-200",
};

type Props = {
  cashHandovers: CashHandover[];
  drivers: Driver[];
  onStatusChange: (id: string, status: CashHandover["status"]) => Promise<void>;
};

export function CashHandoverTable({ cashHandovers, drivers, onStatusChange }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const driverLookup = useMemo(() => {
    return new Map(drivers.map((driver) => [driver.id, driver.name] as const));
  }, [drivers]);

  const handleStatusChange = async (id: string, status: CashHandover["status"]) => {
    setPendingId(id);
    try {
      await onStatusChange(id, status);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="col-span-2 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Cash Reconciliation</h2>
          <p className="text-xs text-slate-400">Approve or reject daily driver submissions</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {cashHandovers.filter((item) => item.status === "pending").length} pending
        </span>
      </header>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cashHandovers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                  No cash submissions yet today.
                </td>
              </tr>
            ) : null}
            {cashHandovers.map((handover) => (
              <tr key={handover.id} className="border-b border-slate-800/70 text-xs">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{driverLookup.get(handover.driverId) ?? handover.driverId}</p>
                  <p className="text-slate-500">ID: {handover.driverId}</p>
                  <p className="text-slate-500">Logged {new Date(handover.reportedAt).toLocaleString()}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">₦{handover.amount.toLocaleString()}</p>
                  {handover.notes ? <p className="text-slate-500">{handover.notes}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${statusStyles[handover.status]}`}>
                    {handover.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/30"
                      disabled={pendingId === handover.id}
                      onClick={() => handleStatusChange(handover.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-full bg-rose-500/20 px-3 py-1 text-[11px] uppercase tracking-wide text-rose-200 hover:bg-rose-500/30"
                      disabled={pendingId === handover.id}
                      onClick={() => handleStatusChange(handover.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
