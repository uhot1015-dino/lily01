import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, getWeek, getYear } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "yyyy/MM/dd");
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "yyyy/MM/dd HH:mm");
}

export function getYearMonth(date: Date) {
  return format(date, "yyyy/MM");
}

export function getWeekLabel(date: Date) {
  const year = getYear(date);
  const week = String(getWeek(date, { weekStartsOn: 1 })).padStart(2, "0");
  return `${year}/第${week}週`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(amount);
}
