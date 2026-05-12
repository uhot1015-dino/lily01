"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNELS, CATEGORIES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";

interface OrderData {
  id?: string;
  channel: string;
  status: string;
  orderNumber?: string;
  categoryZh?: string;
  productName: string;
  spec?: string;
  productCode?: string;
  quantity: number;
  totalAmount?: number;
  paymentStatus: string;
  orderDate?: string;
  shippingDate?: string;
  deliveryMethod?: string;
  buyerName?: string;
  buyerPhone?: string;
  email?: string;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  notes?: string;
}

interface Props {
  defaultValues?: OrderData;
  onSuccess: () => void;
  onCancel: () => void;
}

function toDateInput(val?: string | null) {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

export function OrderForm({ defaultValues, onSuccess, onCancel }: Props) {
  const isEdit = !!defaultValues?.id;
  const [form, setForm] = useState({
    channel: defaultValues?.channel ?? "官網",
    status: defaultValues?.status ?? "PENDING",
    orderNumber: defaultValues?.orderNumber ?? "",
    categoryZh: defaultValues?.categoryZh ?? "",
    productName: defaultValues?.productName ?? "",
    spec: defaultValues?.spec ?? "",
    productCode: defaultValues?.productCode ?? "",
    quantity: defaultValues?.quantity?.toString() ?? "1",
    totalAmount: defaultValues?.totalAmount?.toString() ?? "",
    paymentStatus: defaultValues?.paymentStatus ?? "UNPAID",
    orderDate: toDateInput(defaultValues?.orderDate),
    shippingDate: toDateInput(defaultValues?.shippingDate),
    deliveryMethod: defaultValues?.deliveryMethod ?? "",
    buyerName: defaultValues?.buyerName ?? "",
    buyerPhone: defaultValues?.buyerPhone ?? "",
    email: defaultValues?.email ?? "",
    recipientName: defaultValues?.recipientName ?? "",
    recipientPhone: defaultValues?.recipientPhone ?? "",
    address: defaultValues?.address ?? "",
    notes: defaultValues?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = isEdit ? `/api/orders/${defaultValues!.id}` : "/api/orders";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">通路 *</label>
          <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">訂單狀態</label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">訂單編號</label>
          <Input value={form.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} placeholder="選填" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">分類</label>
          <Select value={form.categoryZh} onValueChange={(v) => set("categoryZh", v)}>
            <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">不指定</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">商品名稱 *</label>
        <Input value={form.productName} onChange={(e) => set("productName", e.target.value)} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">規格</label>
          <Input value={form.spec} onChange={(e) => set("spec", e.target.value)} placeholder="選填" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">商品代碼</label>
          <Input value={form.productCode} onChange={(e) => set("productCode", e.target.value)} placeholder="選填" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">數量</label>
          <Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">總金額</label>
          <Input type="number" min="0" value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} placeholder="選填" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">付款狀態</label>
          <Select value={form.paymentStatus} onValueChange={(v) => set("paymentStatus", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">訂購日期</label>
          <Input type="date" value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">出貨日期</label>
          <Input type="date" value={form.shippingDate} onChange={(e) => set("shippingDate", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">配送方式</label>
        <Input value={form.deliveryMethod} onChange={(e) => set("deliveryMethod", e.target.value)} placeholder="例：實體店面取貨、當日快遞" />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-neutral-600 mb-3">訂購人資訊</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">訂購人</label>
            <Input value={form.buyerName} onChange={(e) => set("buyerName", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">訂購人電話</label>
            <Input value={form.buyerPhone} onChange={(e) => set("buyerPhone", e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-neutral-600 mb-3">收件人資訊</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">收件人</label>
            <Input value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">收件人電話</label>
            <Input value={form.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">配送地址</label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">備註</label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "儲存中…" : isEdit ? "更新訂單" : "新增訂單"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">取消</Button>
      </div>
    </form>
  );
}
