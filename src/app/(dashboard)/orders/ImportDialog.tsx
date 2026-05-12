"use client";
import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/orders/import", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "匯入失敗");
    } else {
      setResult(data);
    }
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>匯入訂單 Excel / CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            支援從官網/Pinkoi/QDM 匯出的 Excel（.xlsx）或 CSV 檔案。<br />
            需包含「通路」欄位，系統會自動對應欄位。
          </p>

          <div
            className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center cursor-pointer hover:border-neutral-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium text-neutral-700">{file.name}</p>
            ) : (
              <p className="text-sm text-neutral-400">點擊選擇檔案，或拖曳至此</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg p-3">
              <CheckCircle className="h-4 w-4" />
              成功匯入 {result.imported} 筆，略過 {result.skipped} 筆
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleUpload} disabled={!file || loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              開始匯入
            </Button>
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {result ? "關閉" : "取消"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
