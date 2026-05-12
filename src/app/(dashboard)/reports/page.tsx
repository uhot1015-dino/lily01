"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

interface ChannelData {
  channel: string;
  amount: number;
}

interface ExpenseData {
  subject: string;
  amount: number;
}

interface ReportData {
  monthly: MonthlyData[];
  channelBreakdown: ChannelData[];
  expenseBreakdown: ExpenseData[];
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?year=${year}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [year]);

  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  const totalIncome = data?.monthly.reduce((s, m) => s + m.income, 0) ?? 0;
  const totalExpense = data?.monthly.reduce((s, m) => s + m.expense, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">報表</h1>
          <p className="text-sm text-neutral-500 mt-1">年度損益與業績分析</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 bg-white"
        >
          {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center py-20 text-neutral-400">載入中…</p>
      ) : (
        <div className="space-y-6">
          {/* Annual Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-neutral-500 mb-1">年度總收入</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-neutral-500 mb-1">年度總支出</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-neutral-500 mb-1">年度淨利</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-neutral-900" : "text-red-500"}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          </div>

          {/* Monthly P&L Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-neutral-50">
              <h2 className="font-semibold text-sm">月份損益表</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">月份</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">收入</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">支出</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">淨利</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">收支比</th>
                </tr>
              </thead>
              <tbody>
                {data?.monthly.map((m) => (
                  <tr key={m.month} className="border-b hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{m.month}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600">{formatCurrency(m.income)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-500">{formatCurrency(m.expense)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${m.profit >= 0 ? "text-neutral-900" : "text-red-500"}`}>
                      {formatCurrency(m.profit)}
                    </td>
                    <td className="px-4 py-3">
                      {m.income > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-100 rounded-full h-2">
                            <div
                              className="bg-green-400 h-2 rounded-full"
                              style={{ width: `${Math.min((m.income / (m.income + m.expense)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500 w-10">
                            {((m.income / (m.income + m.expense)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Channel + Expense Breakdown */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-neutral-50">
                <h2 className="font-semibold text-sm">通路業績</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {data?.channelBreakdown.length === 0 ? (
                    <tr><td className="text-center py-8 text-neutral-400">無資料</td></tr>
                  ) : (
                    data?.channelBreakdown.map((c) => (
                      <tr key={c.channel} className="border-b hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium">{c.channel}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-neutral-50">
                <h2 className="font-semibold text-sm">支出科目分析</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {data?.expenseBreakdown.length === 0 ? (
                    <tr><td className="text-center py-8 text-neutral-400">無資料</td></tr>
                  ) : (
                    data?.expenseBreakdown.map((e) => (
                      <tr key={e.subject} className="border-b hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium">{e.subject}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-500">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
