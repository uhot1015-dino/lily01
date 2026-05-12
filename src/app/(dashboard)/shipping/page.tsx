"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SHIPPING_FIELDS } from "@/lib/constants";

interface Order {
  id: string;
  channel: string;
  orderNumber?: string;
  productName: string;
  spec?: string;
  quantity: number;
  totalAmount?: number;
  orderDate?: string;
  shippingDate?: string;
  deliveryMethod?: string;
  buyerName?: string;
  buyerPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  notes?: string;
  status: string;
}

const DEFAULT_FIELDS = [
  "productName", "spec", "quantity", "buyerName", "buyerPhone",
  "recipientName", "recipientPhone", "address", "shippingDate", "deliveryMethod", "notes",
];

function ShippingContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("orderId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string[]>(preselectedId ? [preselectedId] : []);
  const [enabledFields, setEnabledFields] = useState<string[]>(DEFAULT_FIELDS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/orders?${params}`);
    const data: Order[] = await res.json();
    // Filter by shipping date if set
    const filtered = filterDate
      ? data.filter((o) => o.shippingDate && o.shippingDate.startsWith(filterDate))
      : data;
    setOrders(filtered);
    setLoading(false);
  }, [search, filterDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function toggleField(key: string) {
    setEnabledFields((f) =>
      f.includes(key) ? f.filter((x) => x !== key) : [...f, key]
    );
  }

  function toggleOrder(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function toggleAll() {
    if (selected.length === orders.length) {
      setSelected([]);
    } else {
      setSelected(orders.map((o) => o.id));
    }
  }

  const selectedOrders = orders.filter((o) => selected.includes(o.id));

  function getFieldValue(order: Order, key: string): string {
    const val = order[key as keyof Order];
    if (val === null || val === undefined) return "—";
    if (key === "shippingDate" || key === "orderDate") return formatDate(val as string);
    if (key === "totalAmount") return formatCurrency(val as number);
    return String(val);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">出貨單</h1>
          <p className="text-sm text-neutral-500 mt-1">選擇訂單並勾選欄位後列印</p>
        </div>
        <Button onClick={handlePrint} disabled={selected.length === 0}>
          <Printer className="h-4 w-4 mr-2" />
          列印 ({selected.length} 筆)
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6 print:hidden">
        {/* Left: order picker */}
        <div className="col-span-3">
          {/* Filters */}
          <div className="flex gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-neutral-400" />
              <Input
                placeholder="搜尋訂單…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
                className="max-w-xs"
              />
              <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">出貨日篩選</label>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">出貨日</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">商品</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">收件人</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">地址</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-neutral-400">載入中…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-neutral-400">無訂單</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className={`border-b border-neutral-50 cursor-pointer ${selected.includes(o.id) ? "bg-rose-50" : "hover:bg-neutral-50"}`} onClick={() => toggleOrder(o.id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleOrder(o.id)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{o.shippingDate ? formatDate(o.shippingDate) : "—"}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate">{o.productName}</td>
                      <td className="px-4 py-3">{o.recipientName ?? o.buyerName ?? "—"}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-neutral-500">{o.address ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: field selector */}
        <div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold mb-3">顯示欄位</p>
            <div className="space-y-2">
              {SHIPPING_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledFields.includes(key)}
                    onChange={() => toggleField(key)}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Print area */}
      {selectedOrders.length > 0 && (
        <div className="mt-8 print:mt-0">
          <div className="space-y-6 print:space-y-0">
            {selectedOrders.map((order, idx) => (
              <div
                key={order.id}
                className="bg-white border border-neutral-200 rounded-xl p-6 print:border print:rounded-none print:page-break-after-always"
              >
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">🌸 GOODLILY</span>
                    <span className="text-neutral-400">出貨單</span>
                  </div>
                  <span className="text-sm text-neutral-500">#{idx + 1}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {SHIPPING_FIELDS.filter((f) => enabledFields.includes(f.key)).map(({ key, label }) => (
                    <div key={key} className={key === "address" || key === "notes" ? "col-span-2" : ""}>
                      <dt className="text-xs text-neutral-500">{label}</dt>
                      <dd className="text-sm font-medium mt-0.5">{getFieldValue(order, key)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShippingPage() {
  return (
    <Suspense>
      <ShippingContent />
    </Suspense>
  );
}
