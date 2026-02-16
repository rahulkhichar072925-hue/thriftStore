'use client'

import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const getPickupDate = (item) => {
  if (!item?.pickupDate) return null;
  const date = new Date(item.pickupDate);
  return Number.isNaN(date.getTime()) ? null : date;
};

const STATUS_COLORS = {
  REQUESTED: { dot: "bg-amber-500", ring: "ring-amber-300" },
  APPROVED: { dot: "bg-blue-500", ring: "ring-blue-300" },
  PICKED_UP: { dot: "bg-indigo-500", ring: "ring-indigo-300" },
  REFUNDED: { dot: "bg-emerald-500", ring: "ring-emerald-300" },
  REJECTED: { dot: "bg-rose-500", ring: "ring-rose-300" },
};

const getStatusKey = (status) => String(status || "REQUESTED").toUpperCase();

const getDotClass = (status, isSelected) => {
  const key = getStatusKey(status);
  const base = STATUS_COLORS[key]?.dot || "bg-slate-400";
  return isSelected ? "bg-white" : base;
};

const getRingClass = (status) => {
  const key = getStatusKey(status);
  return STATUS_COLORS[key]?.ring || "ring-slate-300";
};

const buildCalendarDays = (monthDate) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
};

export default function ReturnsCalendar({ returnsList = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const filteredReturns = useMemo(() => {
    if (statusFilter === "ALL") return returnsList;
    return returnsList.filter(
      (item) => String(item?.status || "").toUpperCase() === statusFilter
    );
  }, [returnsList, statusFilter]);

  const pickupsByDay = useMemo(() => {
    const map = new Map();
    filteredReturns.forEach((item) => {
      const date = getPickupDate(item);
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [filteredReturns]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return pickupsByDay.get(key) || [];
  }, [selectedDate, pickupsByDay]);

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          className="text-sm text-slate-600 hover:underline"
        >
          Prev
        </button>
        <p className="font-semibold text-slate-800">{format(currentMonth, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="text-sm text-slate-600 hover:underline"
        >
          Next
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-500">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
        >
          {["ALL", "REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED", "REJECTED"].map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const monthKey = format(currentMonth, "yyyy-MM");
            const rows = filteredReturns
              .filter((item) => {
                const date = getPickupDate(item);
                return date && format(date, "yyyy-MM") === monthKey;
              })
              .map((item) => ({
                id: item.id,
                status: item.status,
                product: item.product?.name || "",
                store: item.store?.name || "",
                pickupDate: item.pickupDate || "",
                pickupWindow: item.pickupWindow || "",
                pickupAddress: item.pickupAddress || "",
              }));

            const header = "id,status,product,store,pickupDate,pickupWindow,pickupAddress";
            const csv = [header]
              .concat(
                rows.map((row) =>
                  [
                    row.id,
                    row.status,
                    `"${row.product.replace(/"/g, '""')}"`,
                    `"${row.store.replace(/"/g, '""')}"`,
                    row.pickupDate,
                    `"${row.pickupWindow.replace(/"/g, '""')}"`,
                    `"${row.pickupAddress.replace(/"/g, '""')}"`,
                  ].join(",")
                )
              )
              .join("\n");

            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `returns-${monthKey}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {["REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED", "REJECTED"].map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${getDotClass(status, false)}`} />
              {status.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-xs text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasPickup = pickupsByDay.has(key);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayItems = pickupsByDay.get(key) || [];
          const dayStatuses = Array.from(
            new Set(dayItems.map((item) => getStatusKey(item?.status)))
          );
          const ringClass = hasPickup ? getRingClass(dayStatuses[0]) : "";
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(day)}
              className={`h-10 rounded-md border border-slate-200 flex flex-col items-center justify-center ${
                isSelected ? "bg-slate-900 text-white" : "bg-white text-slate-700"
              } ${hasPickup && !isSelected ? `ring-2 ${ringClass}` : ""}`}
            >
              <span>{format(day, "d")}</span>
              {hasPickup && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {dayStatuses.slice(0, 3).map((status) => (
                    <span
                      key={`${key}-${status}`}
                      className={`h-1.5 w-1.5 rounded-full ${getDotClass(status, isSelected)}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-800">
          Pickups on {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
        </p>
        <div className="mt-2 space-y-2">
          {selectedItems.length === 0 ? (
            <p className="text-xs text-slate-500">No pickups scheduled.</p>
          ) : (
            selectedItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">{item.product?.name || "Product"}</p>
                <p className="text-xs text-slate-500">{item.store?.name || item.user?.email || ""}</p>
                <p className="text-xs text-slate-500">
                  {item.pickupWindow ? `Window: ${item.pickupWindow}` : "Window: -"}
                </p>
                <p className="text-xs text-slate-500">{item.pickupAddress || "Address: -"}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
