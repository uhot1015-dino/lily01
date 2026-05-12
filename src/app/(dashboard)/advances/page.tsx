"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, CircleCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdvanceForm } from "./AdvanceForm";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ADVANCE_STATUS_LABELS } from "@/lib/constants";
import { useSession } from "next-auth/react";

interface Advance {
  id: string;
  date: string;
  person: string;
  amount: number;
  purpose: string;
  subject?: string;
  item?: string;
  status: string;
  reimburseAt?: string;
  notes?: string;
  submitter: { name: string };
}

export default function AdvancesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Advance | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/advances?${params}`);
      const data = await res.json();
      setAdvances(Array.isArray(data) ? data : []);
    } catch {
      setAdvances([]);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const totalPending = advances
    .filter((a) => a.status === "PENDING")
    .reduce((s, a) => s + a.amount, 0);

  async function handleReimburse(a: Advance) {
    if (!confirm(`確定要核銷 ${a.person} 的 ${formatCurrency(a.amount)} 代墊？`)) return;
    await fetch(`/api/advances/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, status: "REIMBURSED", reimburseAt: new Date().toISOString() }),
    });
    fetchAdvances();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這筆代墊記錄？")) return;
    await fetch(`/api/advances/${id}`, { method: "DELETE" });
    fetchAdvances();
  }

  function handleClose() {
    setShowForm(false);
    setEditItem(null);
    fetchAdvances();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">代墊清單 & 核銷</h1>
          <p className="text-sm text-neutral-500 mt-1">員工代墊款項記錄與核銷管理</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />新增代墊
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-1">待核銷總額</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-1">待核銷筆數</p>
          <p className="text-2xl font-bold">{advances.filter((a) => a.status === "PENDING").length} 筆</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">全部</option>
          <option value="PENDING">待核銷</option>
          <option value="REIMBURSED">已核銷</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">日期</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">代墊人</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">用途</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">科目</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">金額</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">狀態</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">核銷日</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">備註</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-neutral-400">載入中…</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-neutral-400">無代墊記錄</td></tr>
              ) : (
                advances.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(a.date)}</td>
                    <td className="px-4 py-3 font-medium">{a.person}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{a.purpose}</td>
                    <td className="px-4 py-3 text-neutral-500">{a.subject}{a.item ? ` / ${a.item}` : ""}</td>
                    <td className="px-4 py-3 font-medium tabular-nums text-amber-600">{formatCurrency(a.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.status === "PENDING" ? "warning" : "success"}>
                        {ADVANCE_STATUS_LABELS[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                      {a.reimburseAt ? formatDate(a.reimburseAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 max-w-[150px] truncate">{a.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {a.status === "PENDING" && isAdmin && (
                          <Button variant="ghost" size="icon" title="核銷" onClick={() => handleReimburse(a)}>
                            <CircleCheck className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setEditItem(a); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "編輯代墊" : "新增代墊"}</DialogTitle>
          </DialogHeader>
          <AdvanceForm defaultValues={editItem ?? undefined} onSuccess={handleClose} onCancel={handleClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
