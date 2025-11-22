"use client";

import { useEffect, useState } from "react";

import { Driver, Order } from "@/lib/types";

type Props = {
  pendingOrders: Order[];
  drivers: Driver[];
  onAssign: (orderId: string, driverId: string) => Promise<void>;
};

export function AssignmentPanel({ pendingOrders, drivers, onAssign }: Props) {
  const [orderId, setOrderId] = useState<string>(pendingOrders[0]?.id ?? "");
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (pendingOrders.length && !orderId) {
      setOrderId(pendingOrders[0]!.id);
    }
  }, [pendingOrders, orderId]);

  useEffect(() => {
    if (drivers.length && !driverId) {
      setDriverId(drivers[0]!.id);
    }
  }, [drivers, driverId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId || !driverId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onAssign(orderId, driverId);
      setIsError(false);
      setFeedback("Order assignment pushed to driver device");
    } catch (error) {
      setIsError(true);
      setFeedback((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Manual Assignment</h2>
          <p className="text-xs text-slate-400">Override automation and push a task to a driver instantly</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {pendingOrders.length} waiting
        </span>
      </header>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-300">
          Select Order
          <select
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            disabled={!pendingOrders.length}
          >
            {pendingOrders.length ? null : (
              <option value="">No pending orders</option>
            )}
            {pendingOrders.map((order) => (
              <option value={order.id} key={order.id}>
                {order.reference} • {order.customerName} • ₦{order.cashDue.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Assign Driver
          <select
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            disabled={!drivers.length}
          >
            {drivers.length ? null : <option value="">No drivers available</option>}
            {drivers.map((driver) => (
              <option value={driver.id} key={driver.id}>
                {driver.name} ({driver.vehiclePlate}) • {driver.currentOrderIds.length} active
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting || !orderId || !driverId}
          className="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
        >
          {submitting ? "Assigning..." : "Push to Driver"}
        </button>
        {feedback ? (
          <p className={`text-xs ${isError ? "text-rose-300" : "text-emerald-300"}`}>{feedback}</p>
        ) : null}
      </form>
    </section>
  );
}
