"use client";
import { useState, useRef } from "react";
import { Upload, CircleCheck, CircleAlert } from "lucide-react";
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
  const [progress, setProgress] = useState<{ imported: number; total: number; message: string } | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/orders/import", { method: "POST", body: formData });
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
              setError(evt.error);
            } else if (evt.stage === "done") {
              setResult({ imported: evt.imported, skipped: evt.skipped });
              setProgress(null);
            } else if (evt.stage === "importing") {
              setProgress({ imported: evt.imported, total: evt.total, message: evt.message });
            } else {
              setProgress({ imported: 0, total: 0, message: evt.message });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setFile(null);
    setResult(null);
    setError("");
    setProgress(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>匯入訂單 Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            支援含「通路」欄位的 Excel（.xlsx）。<br />
            會自動揃描所有工作表，已存在的訂單會自動略過。
          </p>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-neutral-400"} border-neutral-200`}
            onClick={() => !loading && fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium text-neutral-700">{file.name}</p>
            ) : (
              <p className="text-sm text-neutral-400">點擊選擇 Excel 檔案</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-blue-700">
                <span>{progress.message}</span>
                {progress.total > 0 && <span>{progress.imported} / {progress.total}</span>}
              </div>
              {progress.total > 0 && (
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.imported / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <CircleAlert className="h-4 w-4" />{error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg p-3">
              <CircleCheck className="h-4 w-4" />
              成功匯入 <strong>{result.imported}</strong> 筆，略過 {result.skipped} 筆（重複或空白）
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleUpload} disabled={!file || loading} className="flex-1">
              {loading ? (progress?.total ? `${progress.imported} / ${progress.total} 筆` : "處理中…") : "開始匯入"}
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
              {result ? "關閉" : "取消"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
