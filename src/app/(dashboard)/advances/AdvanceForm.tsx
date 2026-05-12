"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_SUBJECTS } from "@/lib/constants";

const PEOPLE = ["Lily", "Christine", "瀞惠", "抹茶"];

interface AdvanceData {
  id?: string;
  date: string;
  person: string;
  amount: number;
  purpose: string;
  subject?: string;
  item?: string;
  status?: string;
  notes?: string;
}

interface Props {
  defaultValues?: AdvanceData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdvanceForm({ defaultValues, onSuccess, onCancel }: Props) {
  const isEdit = !!defaultValues?.id;
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: defaultValues?.date ? new Date(defaultValues.date).toISOString().slice(0, 10) : today,
    person: defaultValues?.person ?? PEOPLE[0],
    amount: defaultValues?.amount?.toString() ?? "",
    purpose: defaultValues?.purpose ?? "",
    subject: defaultValues?.subject ?? "",
    item: defaultValues?.item ?? "",
    notes: defaultValues?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const subjects = Object.keys(EXPENSE_SUBJECTS);
  const items = form.subject ? (EXPENSE_SUBJECTS[form.subject] ?? []) : [];

  useEffect(() => {
    if (items.length > 0 && !items.includes(form.item)) {
      setForm((f) => ({ ...f, item: items[0] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subject]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = isEdit ? `/api/advances/${defaultValues!.id}` : "/api/advances";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: defaultValues?.status ?? "PENDING" }),
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
          <label className="block text-sm font-medium mb-1">代墊人 *</label>
          <Select value={form.person} onValueChange={(v) => set("person", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PEOPLE.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">用途說明 *</label>
        <Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="例：採購排骨花材" required />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">金額 *</label>
        <Input type="number" min="0" step="1" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">科目</label>
          <Select value={form.subject} onValueChange={(v) => set("subject", v)}>
            <SelectTrigger><SelectValue placeholder="選擇科目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">不指定</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">細項</label>
          <Select value={form.item} onValueChange={(v) => set("item", v)} disabled={!form.subject}>
            <SelectTrigger><SelectValue placeholder="選擇細項" /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">備註</label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
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
