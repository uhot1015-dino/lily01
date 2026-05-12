"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, RECEIPT_TYPES, INCOME_SUBJECTS, EXPENSE_SUBJECTS } from "@/lib/constants";

interface Props {
  defaultValues?: {
    id?: string;
    date: string;
    paymentMethod: string;
    needsReimburse: boolean;
    category: string;
    subject: string;
    item: string;
    amount: number;
    receiptType: string;
    receiptNumber?: string;
    notes?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({ defaultValues, onSuccess, onCancel }: Props) {
  const isEdit = !!defaultValues?.id;
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: defaultValues?.date ? new Date(defaultValues.date).toISOString().slice(0, 10) : today,
    paymentMethod: defaultValues?.paymentMethod ?? "銀行轉帳-玉山",
    needsReimburse: defaultValues?.needsReimburse ?? false,
    category: defaultValues?.category ?? "收入",
    subject: defaultValues?.subject ?? "",
    item: defaultValues?.item ?? "",
    amount: defaultValues?.amount?.toString() ?? "",
    receiptType: defaultValues?.receiptType ?? "無憑證",
    receiptNumber: defaultValues?.receiptNumber ?? "",
    notes: defaultValues?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const subjectMap = form.category === "收入" ? INCOME_SUBJECTS : EXPENSE_SUBJECTS;
  const subjects = Object.keys(subjectMap);
  const items = form.subject ? (subjectMap[form.subject] ?? []) : [];

  useEffect(() => {
    if (!subjects.includes(form.subject)) {
      setForm((f) => ({ ...f, subject: subjects[0] ?? "", item: "" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  useEffect(() => {
    if (items.length > 0 && !items.includes(form.item)) {
      setForm((f) => ({ ...f, item: items[0] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subject]);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = isEdit ? `/api/transactions/${defaultValues!.id}` : "/api/transactions";
    const method = isEdit ? "PUT" : "POST";
    await fetch(url, {
      method,
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
          <label className="block text-sm font-medium mb-1">日期 *</label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">收付款方式 *</label>
          <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">收 / 支 *</label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="收入">收入</SelectItem>
              <SelectItem value="支出">支出</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">科目 *</label>
          <Select value={form.subject} onValueChange={(v) => set("subject", v)}>
            <SelectTrigger><SelectValue placeholder="選擇科目" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">細項 *</label>
          <Select value={form.item} onValueChange={(v) => set("item", v)}>
            <SelectTrigger><SelectValue placeholder="選擇細項" /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">金額 *</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">憑證種類</label>
          <Select value={form.receiptType} onValueChange={(v) => set("receiptType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECEIPT_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">收據/發票編號</label>
        <Input
          value={form.receiptNumber}
          onChange={(e) => set("receiptNumber", e.target.value)}
          placeholder="選填"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="needsReimburse"
          checked={form.needsReimburse}
          onChange={(e) => set("needsReimburse", e.target.checked)}
          className="rounded"
        />
        <label htmlFor="needsReimburse" className="text-sm font-medium">需要請款（零用金代墊）</label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">備註</label>
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="選填"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "儲存中…" : isEdit ? "更新" : "新增"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">取消</Button>
      </div>
    </form>
  );
}
