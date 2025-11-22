"use client";

import { CashHandover, Driver, Order } from "@/lib/types";
import { format } from "date-fns";
import { useMemo } from "react";

type Props = {
  orders: Order[];
  drivers: Driver[];
  cashHandovers: CashHandover[];
};

export function SummaryCards({ orders, drivers, cashHandovers }: Props) {
  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending").length;
    const inTransit = orders.filter((order) => order.status === "in_transit").length;
    const deliveredToday = orders.filter((order) => {
      if (order.status !== "delivered") return false;
      const latest = order.timeline[order.timeline.length - 1];
      if (!latest) return false;
      return new Date(latest.timestamp).toDateString() === new Date().toDateString();
    }).length;
    const cashPending = cashHandovers
      .filter((handover) => handover.status === "pending")
      .reduce((sum, item) => sum + item.amount, 0);

    const activeDrivers = drivers.filter((driver) => driver.status === "active").length;
    const idleDrivers = drivers.filter((driver) => driver.status === "idle").length;

    return {
      pending,
      inTransit,
      deliveredToday,
      cashPending,
      activeDrivers,
      idleDrivers,
      lastCashEvent: cashHandovers[0]?.reportedAt,
    };
  }, [orders, drivers, cashHandovers]);

  return (
    <section className="grid gap-4 lg:grid-cols-6">
      <Card
        title="Pending Dispatch"
        metric={stats.pending.toString()}
        caption="Orders awaiting driver assignment"
        accent="bg-amber-500/20 text-amber-200 ring-amber-500/70"
      />
      <Card
        title="In Transit"
        metric={stats.inTransit.toString()}
        caption="Deliveries currently on the road"
        accent="bg-sky-500/20 text-sky-200 ring-sky-500/70"
      />
      <Card
        title="Delivered Today"
        metric={stats.deliveredToday.toString()}
        caption="Successful drop-offs logged today"
        accent="bg-emerald-500/20 text-emerald-200 ring-emerald-500/70"
      />
      <Card
        title="Cash Pending"
        metric={`₦${stats.cashPending.toLocaleString()}`}
        caption="Awaiting finance confirmation"
        accent="bg-rose-500/20 text-rose-200 ring-rose-500/70"
      />
      <Card
        title="Active Drivers"
        metric={`${stats.activeDrivers}/${drivers.length}`}
        caption={`${stats.idleDrivers} idle, ${drivers.length} total`}
        accent="bg-purple-500/20 text-purple-200 ring-purple-500/70"
      />
      <Card
        title="Cash Last Synced"
        metric={
          stats.lastCashEvent
            ? format(new Date(stats.lastCashEvent), "HH:mm")
            : "No submissions"
        }
        caption="Latest cash handover timestamp"
        accent="bg-slate-500/20 text-slate-200 ring-slate-500/70"
      />
    </section>
  );
}

type CardProps = {
  title: string;
  metric: string;
  caption: string;
  accent: string;
};

function Card({ title, metric, caption, accent }: CardProps) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{title}</p>
      <span className={`text-2xl font-semibold tracking-tight ${accent} ring-1 ring-inset rounded-md px-2 py-1 w-fit`}>{metric}</span>
      <p className="text-xs text-slate-500">{caption}</p>
    </article>
  );
}
