"use client";

import { useMemo, useState } from "react";

import { Order, OrderStatus } from "@/lib/types";

type Props = {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onNotifyDriver: (order: Order) => Promise<void>;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  returned: "Returned",
};

export function OrdersTable({ orders, onStatusChange, onNotifyDriver }: Props) {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await onStatusChange(orderId, status);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleNotify = async (order: Order) => {
    setBusyOrderId(order.id);
    try {
      await onNotifyDriver(order);
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <section className="col-span-2 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Order Control Center</h2>
          <p className="text-xs text-slate-400">Update status, push notifications, and monitor SLAs</p>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as OrderStatus | "all")}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </header>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Cash</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                  No orders match the selected filter.
                </td>
              </tr>
            ) : null}
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-slate-800/70 text-xs">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{order.reference}</p>
                  <p className="text-slate-400">{order.customerName}</p>
                  <p className="text-slate-500">{order.address}</p>
                </td>
                <td className="px-4 py-3">
                  {order.assignedDriverId ? (
                    <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200">
                      {order.assignedDriverId}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-200">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">₦{order.cashDue.toLocaleString()}</p>
                  <p className="text-slate-500">Collected: ₦{order.cashCollected.toLocaleString()}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(STATUS_LABELS).map((key) => (
                      <button
                        key={key}
                        className={`rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-wide transition ${
                          order.status === key
                            ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-200"
                            : "hover:border-emerald-500/70 hover:text-emerald-200"
                        }`}
                        disabled={busyOrderId === order.id}
                        onClick={() => handleStatusChange(order.id, key as OrderStatus)}
                      >
                        {STATUS_LABELS[key as OrderStatus]}
                      </button>
                    ))}
                    <button
                      className="rounded-full bg-sky-500/20 px-3 py-1 text-[11px] uppercase tracking-wide text-sky-200 hover:bg-sky-500/30"
                      onClick={() => handleNotify(order)}
                      disabled={busyOrderId === order.id}
                    >
                      Notify Driver
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
