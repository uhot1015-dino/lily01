"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Upload, Pencil, Trash2, FileText, BookCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderForm } from "./OrderForm";
import { ImportDialog } from "./ImportDialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CHANNELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Order {
  id: string;
  channel: string;
  status: string;
  orderNumber?: string;
  categoryZh?: string;
  productName: string;
  spec?: string;
  quantity: number;
  totalAmount?: number;
  paymentStatus: string;
  orderDate?: string;
  shippingDate?: string;
  deliveryMethod?: string;
  buyerName?: string;
  recipientName?: string;
  address?: string;
  notes?: string;
  accountedAt?: string | null;
}

const STATUS_BADGE: Record<string, "secondary" | "info" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPED: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editItem, setEditItem] = useState<Order | null>(null);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterChannel) params.set("channel", filterChannel);
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("q", search);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, [filterChannel, filterStatus, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這筆訂單？")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    fetchOrders();
  }

  async function handleAccount(o: Order) {
    if (!confirm(`確定要將「${o.productName}」${o.totalAmount ? formatCurrency(o.totalAmount) : ""} 記入收入帳目？`)) return;
    await fetch(`/api/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "account" }),
    });
    fetchOrders();
  }

  async function handleRefund(o: Order) {
    if (!confirm(`確定要退貨「${o.productName}」？${o.accountedAt ? "已記入的收入將會沖銷。" : ""}`)) return;
    await fetch(`/api/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refund" }),
    });
    fetchOrders();
  }

  function handleClose() {
    setShowForm(false);
    setEditItem(null);
    fetchOrders();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">訂單管理</h1>
          <p className="text-sm text-neutral-500 mt-1">管理各通路訂單</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />匯入 Excel/CSV
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />新增訂單
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-neutral-400" />
          <Input
            placeholder="搜尋訂購人/收件人/商品"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
        </div>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">所有通路</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">所有狀態</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">訂購日</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">通路</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">商品</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">數量</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">金額</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">進度</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">付款</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">收件人</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">出貨日</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">帳務</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-neutral-400">載入中…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-neutral-400">無訂單資料</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 whitespace-nowrap">{o.orderDate ? formatDate(o.orderDate) : "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{o.channel}</Badge></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate font-medium">{o.productName}</p>
                      {o.spec && <p className="text-xs text-neutral-400 truncate">{o.spec}</p>}
                    </td>
                    <td className="px-4 py-3">{o.quantity}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {o.totalAmount ? formatCurrency(o.totalAmount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={o.paymentStatus === "PAID" ? "success" : "warning"}>
                        {PAYMENT_STATUS_LABELS[o.paymentStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{o.recipientName ?? o.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{o.shippingDate ? formatDate(o.shippingDate) : "—"}</td>
                    <td className="px-4 py-3">
                      {o.status === "CANCELLED" ? (
                        <Badge variant="destructive">已取消</Badge>
                      ) : o.accountedAt ? (
                        <Badge variant="success">已記帳</Badge>
                      ) : (
                        <Badge variant="warning">未記帳</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Link href={`/shipping?orderId=${o.id}`} title="出貨單" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100">
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => { setEditItem(o); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {o.status !== "CANCELLED" && !o.accountedAt && (
                          <Button variant="ghost" size="icon" title="記入帳目" onClick={() => handleAccount(o)}>
                            <BookCheck className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {o.status !== "CANCELLED" && o.accountedAt && (
                          <Button variant="ghost" size="icon" title="退貨沖銷" onClick={() => handleRefund(o)}>
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "編輯訂單" : "新增訂單"}</DialogTitle>
          </DialogHeader>
          <OrderForm defaultValues={editItem ?? undefined} onSuccess={handleClose} onCancel={handleClose} />
        </DialogContent>
      </Dialog>

      <ImportDialog open={showImport} onClose={() => { setShowImport(false); fetchOrders(); }} />
    </div>
  );
}
