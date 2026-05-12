"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") { router.push("/accounting"); return; }
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, [session, router]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("新增成功");
      setNewUser({ name: "", email: "", password: "", role: "EMPLOYEE" });
      const updated = await fetch("/api/users").then((r) => r.json());
      setUsers(updated);
    } else {
      const d = await res.json();
      setMsg(d.error ?? "新增失敗");
    }
  }

  async function handleDelete(id: string) {
    if (id === session?.user?.id) { alert("無法刪除自己的帳號"); return; }
    if (!confirm("確定要刪除此帳號？")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">系統設定</h1>
        <p className="text-sm text-neutral-500 mt-1">管理使用者帳號</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">新增帳號</h2>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">姓名 *</label>
              <Input value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">密碼 *</label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">角色</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
              >
                <option value="EMPLOYEE">員工（只能新增代墊）</option>
                <option value="ADMIN">管理員（完整權限）</option>
              </select>
            </div>
            {msg && <p className="text-sm text-rose-500">{msg}</p>}
            <Button type="submit" disabled={saving} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? "新增中…" : "新增帳號"}
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">帳號列表</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-neutral-400">{u.email}</p>
                  <p className="text-xs text-neutral-500">{u.role === "ADMIN" ? "管理員" : "員工"}</p>
                </div>
                {u.id !== session?.user?.id && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
