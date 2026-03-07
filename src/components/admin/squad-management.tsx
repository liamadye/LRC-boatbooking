"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Pencil, Check } from "lucide-react";

type SquadMember = {
  id: string;
  fullName: string;
  email: string;
};

type Squad = {
  id: string;
  name: string;
  members: SquadMember[];
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
};

export function SquadManagement({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSquadName, setNewSquadName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addMemberSquadId, setAddMemberSquadId] = useState<string | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  async function fetchSquads() {
    const res = await fetch("/api/admin/squads");
    if (res.ok) {
      setSquads(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSquads();
  }, []);

  async function createSquad() {
    if (!newSquadName.trim()) return;
    const res = await fetch("/api/admin/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSquadName.trim() }),
    });
    if (res.ok) {
      const squad = await res.json();
      setSquads((prev) => [...prev, squad]);
      setNewSquadName("");
      toast({ title: "Squad created" });
      router.refresh();
    } else {
      const data = await res.json();
      toast({ title: data.error, variant: "destructive" });
    }
  }

  async function renameSquad(squadId: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/squads/${squadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSquads((prev) => prev.map((s) => (s.id === squadId ? updated : s)));
      setEditingId(null);
      toast({ title: "Squad renamed" });
      router.refresh();
    } else {
      const data = await res.json();
      toast({ title: data.error, variant: "destructive" });
    }
  }

  async function addMember(squadId: string, userId: string) {
    const res = await fetch(`/api/admin/squads/${squadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addUserIds: [userId] }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSquads((prev) => prev.map((s) => (s.id === squadId ? updated : s)));
      setAddMemberSquadId(null);
      setAddMemberSearch("");
      toast({ title: "Member added" });
      router.refresh();
    }
  }

  async function removeMember(squadId: string, userId: string) {
    const res = await fetch(`/api/admin/squads/${squadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeUserIds: [userId] }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSquads((prev) => prev.map((s) => (s.id === squadId ? updated : s)));
      toast({ title: "Member removed" });
      router.refresh();
    }
  }

  if (loading) {
    return <div className="mt-4 text-muted-foreground">Loading squads...</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Create new squad */}
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="newSquad">New Squad</Label>
          <Input
            id="newSquad"
            placeholder="Squad name"
            value={newSquadName}
            onChange={(e) => setNewSquadName(e.target.value)}
            className="w-60"
            onKeyDown={(e) => e.key === "Enter" && createSquad()}
          />
        </div>
        <Button onClick={createSquad} disabled={!newSquadName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Squad cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {squads.map((squad) => (
          <div key={squad.id} className="rounded-lg border bg-white p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              {editingId === squad.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-40 h-8"
                    onKeyDown={(e) => e.key === "Enter" && renameSquad(squad.id)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => renameSquad(squad.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{squad.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({squad.members.length} member{squad.members.length !== 1 ? "s" : ""})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(squad.id);
                      setEditName(squad.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Members */}
            <div className="space-y-1">
              {squad.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-50">
                  <div>
                    <span className="font-medium">{member.fullName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{member.email}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                    onClick={() => removeMember(squad.id, member.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {squad.members.length === 0 && (
                <div className="text-xs text-muted-foreground py-1">No members yet</div>
              )}
            </div>

            {/* Add member */}
            {addMemberSquadId === squad.id ? (
              <div className="space-y-2">
                <Input
                  placeholder="Search members..."
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto border rounded">
                  {users
                    .filter((u) => {
                      if (!addMemberSearch) return true;
                      const q = addMemberSearch.toLowerCase();
                      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                    })
                    .filter((u) => !squad.members.some((m) => m.id === u.id))
                    .slice(0, 10)
                    .map((u) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 flex justify-between"
                        onClick={() => addMember(squad.id, u.id)}
                      >
                        <span>{u.fullName}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setAddMemberSquadId(null); setAddMemberSearch(""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddMemberSquadId(squad.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Member
              </Button>
            )}
          </div>
        ))}
      </div>

      {squads.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No squads yet. Create one above.
        </div>
      )}
    </div>
  );
}
