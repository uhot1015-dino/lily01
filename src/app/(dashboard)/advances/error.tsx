"use client";
import { useEffect } from "react";
export default function AdvancesError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error("Advances error:", error); }, [error]);
  return (
    <div className="p-6 bg-red-50 rounded-xl border border-red-200">
      <h2 className="font-bold text-red-700 mb-2">代墊頁面發生錯誤</h2>
      <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{error.message}</pre>
      {error.digest && <p className="text-xs text-red-400 mt-1">Digest: {error.digest}</p>}
      <button onClick={() => unstable_retry()} className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-md">重試</button>
    </div>
  );
}
