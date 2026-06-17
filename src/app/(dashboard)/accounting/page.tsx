"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Filter, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionForm } from "./TransactionForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Transaction {
  id: string;
  date: string;
  yearMonth: string;
  weekLabel: string;
  paymentMethod: string;
  needsReimburse: boolean;
  category: string;
  subject: string;
  item: string;
  amount: number;
  receiptType: string;
  receiptNumber?: string;
  notes?: string;
  approvedBy?: string;
  recorder: { name: string };
}

export default function AccountingPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ imported: number; total: number; message: string } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; sheet: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const url = filterMonth === "全部"
        ? "/api/transactions"
        : `/api/transactions?yearMonth=${filterMonth}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
        setApiError(data?.error ?? JSON.stringify(data));
      }
    } catch (err) {
      setTransactions([]);
      setApiError(String(err));
    }
    setLoading(false);
  }, [filterMonth]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalIncome = transactions
    .filter((t) => t.category === "收入")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.category === "支出")
    .reduce((s, t) => s + t.amount, 0);

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這筆記錄？")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchTransactions();
  }

  function handleEdit(t: Transaction) {
    setEditItem(t);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditItem(null);
    fetchTransactions();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportProgress(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.error) {
              alert("匯入失敗：" + evt.error);
            } else if (evt.stage === "done") {
              setImportResult({ imported: evt.imported, skipped: evt.skipped, sheet: evt.sheet });
              setImportProgress(null);
              fetchTransactions();
            } else if (evt.stage === "importing") {
              setImportProgress({ imported: evt.imported, total: evt.total, message: evt.message });
            } else {
              setImportProgress({ imported: 0, total: 0, message: evt.message });
            }
          } catch { /* ignore malformed line */ }
        }
      }
    } catch (err) {
      alert("匯入失敗：" + String(err));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const monthOptions: string[] = ["全部"];
  const now = new Date();
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    for (let m = 12; m >= 1; m--) {
      if (y === now.getFullYear() && m > now.getMonth() + 1) continue;
      monthOptions.push(`${y}/${String(m).padStart(2, "0")}`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">收支記帳</h1>
          <p className="text-sm text-neutral-500 mt-1">記錄花店每筆收支明細</p>
        </div>
        <div className="flex gap-2">
          <label className={`inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium rounded-md border border-neutral-200 bg-white shadow-sm hover:bg-neutral-100 cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="h-4 w-4" />
            {importing ? (importProgress?.total ? `${importProgress.imported} / ${importProgress.total} 筆` : "處理中…") : "匯入 Excel"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />新增
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-1">本月收入</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-1">本月支出</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 mb-1">淨收益</p>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-neutral-900" : "text-red-500"}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {apiError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-mono break-all">
          ⚠️ API 錯誤：{apiError}
        </div>
      )}

      {importing && importProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <div className="flex justify-between mb-1">
            <span>{importProgress.message}</span>
            {importProgress.total > 0 && (
              <span>{importProgress.imported} / {importProgress.total} 筆</span>
            )}
          </div>
          {importProgress.total > 0 && (
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((importProgress.imported / importProgress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {importResult && !importing && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ 從「{importResult.sheet}」成功匯入 <strong>{importResult.imported}</strong> 筆，略過 {importResult.skipped} 筆
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-neutral-400" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">日期</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">收/支</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">科目</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">細項</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">金額</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">收付方式</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">憑證</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">備註</th>
                {isAdmin && <th className="text-left px-4 py-3 font-medium text-neutral-600">操作</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-neutral-400">載入中…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-neutral-400">本月尚無記錄</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.category === "收入" ? "success" : "destructive"}>
                        {t.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{t.subject}</td>
                    <td className="px-4 py-3">{t.item}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      <span className={t.category === "收入" ? "text-green-600" : "text-red-500"}>
                        {t.category === "支出" ? "-" : "+"}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{t.paymentMethod}</td>
                    <td className="px-4 py-3">
                      {t.needsReimburse && (
                        <Badge variant="warning" className="mr-1">請款</Badge>
                      )}
                      <span className="text-neutral-500 text-xs">{t.receiptType}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 max-w-[200px] truncate">{t.notes}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    )}
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
            <DialogTitle>{editItem ? "編輯記帳" : "新增收支"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultValues={editItem ?? undefined}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}