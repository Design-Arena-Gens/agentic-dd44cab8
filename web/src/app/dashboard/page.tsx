"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

import { CashHandover, Driver, Order, OrderStatus } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { AssignmentPanel } from "@/components/dashboard/AssignmentPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { DriverMap } from "@/components/dashboard/DriverMap";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { CashHandoverTable } from "@/components/dashboard/CashHandoverTable";

interface OrdersResponse {
  orders: Order[];
}

interface DriversResponse {
  drivers: Driver[];
}

interface CashResponse {
  cashHandovers: CashHandover[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("lekya.session");
    if (!session) {
      router.replace("/");
    }
  }, [router]);

  const {
    data: orderData,
    isLoading: ordersLoading,
    mutate: mutateOrders,
  } = useSWR<OrdersResponse>("/api/orders", fetcher);

  const {
    data: driverData,
    isLoading: driversLoading,
    mutate: mutateDrivers,
  } = useSWR<DriversResponse>("/api/drivers", fetcher);

  const {
    data: cashData,
    isLoading: cashLoading,
    mutate: mutateCash,
  } = useSWR<CashResponse>("/api/cash", fetcher);

  const orders = useMemo(() => orderData?.orders ?? [], [orderData]);
  const drivers = useMemo(() => driverData?.drivers ?? [], [driverData]);
  const cashHandovers = useMemo(() => cashData?.cashHandovers ?? [], [cashData]);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "pending"), [orders]);
  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.status !== "offline"), [drivers]);

  const loading = ordersLoading || driversLoading || cashLoading;

  const handleAssign = async (orderId: string, driverId: string) => {
    const response = await fetch("/api/orders/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, driverId }),
    });

    if (!response.ok) {
      throw new Error("Failed to assign order");
    }

    await Promise.all([mutateOrders(), mutateDrivers()]);
    setBannerMessage(`Dispatch instruction sent to driver ${driverId}`);
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const response = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    if (!response.ok) {
      throw new Error("Unable to update order status");
    }
    await Promise.all([mutateOrders(), mutateDrivers()]);
    setBannerMessage(`Order ${orderId} updated to ${status}`);
  };

  const handleNotifyDriver = async (order: Order) => {
    if (!order.assignedDriverId) {
      throw new Error("Order has no assigned driver");
    }
    const message = `Lekya assignment update for ${order.reference}. Status: ${order.status}. Cash due: ₦${order.cashDue.toLocaleString()}.`;
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.reference,
        driverId: order.assignedDriverId,
        message,
        channels: ["whatsapp", "sms"],
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to dispatch notifications");
    }
    setBannerMessage(`Driver alert pushed for ${order.reference}`);
  };

  const handleCashStatusChange = async (
    id: string,
    status: CashHandover["status"]
  ) => {
    const response = await fetch(`/api/cash/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error("Failed to update cash status");
    }
    await mutateCash();
    setBannerMessage(`Cash reconciliation for ${id} marked as ${status}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("lekya.session");
    router.replace("/");
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 px-6 py-8 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400">Lekya Logistics</p>
          <h1 className="text-3xl font-semibold text-slate-100">Delivery Command Center</h1>
          <p className="text-sm text-slate-400">
            Orchestrate assignments, track courier movement, and reconcile cash in one secure control surface.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
            Automation Online
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs uppercase tracking-wide text-slate-300 hover:border-emerald-500 hover:text-emerald-200"
          >
            Logout
          </button>
        </div>
      </header>

      {bannerMessage ? (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {bannerMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="grid animate-pulse gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
          Synchronising live data...
        </div>
      ) : null}

      {orders.length > 0 && drivers.length > 0 ? (
        <SummaryCards orders={orders} drivers={drivers} cashHandovers={cashHandovers} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-6">
        <DriverMap drivers={activeDrivers} />
        <AssignmentPanel pendingOrders={pendingOrders} drivers={drivers} onAssign={handleAssign} />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <OrdersTable
          orders={orders}
          onStatusChange={handleStatusChange}
          onNotifyDriver={handleNotifyDriver}
        />
        <CashHandoverTable
          cashHandovers={cashHandovers}
          drivers={drivers}
          onStatusChange={handleCashStatusChange}
        />
      </div>
    </div>
  );
}
