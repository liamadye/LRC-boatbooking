"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Squad = { id: string; name: string };

export function InviteUser({ squads }: { squads: Squad[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [memberType, setMemberType] = useState("recreational");
  const [role, setRole] = useState("member");
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          memberType,
          role,
          squadIds: selectedSquads,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to invite user");
        return;
      }

      toast({ title: "User invited", description: `${fullName} (${email}) has been added.` });
      setEmail("");
      setFullName("");
      setMemberType("recreational");
      setRole("member");
      setSelectedSquads([]);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSquad(squadId: string) {
    setSelectedSquads((prev) =>
      prev.includes(squadId)
        ? prev.filter((id) => id !== squadId)
        : [...prev, squadId]
    );
  }

  return (
    <Card className="mt-4 max-w-lg">
      <CardHeader>
        <CardTitle>Invite New Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label htmlFor="inviteEmail">Email</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="inviteName">Full Name</Label>
            <Input
              id="inviteName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <Label htmlFor="inviteMemberType">Member Type</Label>
            <select
              id="inviteMemberType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={memberType}
              onChange={(e) => setMemberType(e.target.value)}
            >
              <option value="senior_competitive">Senior Competitive</option>
              <option value="student">Student</option>
              <option value="recreational">Recreational</option>
            </select>
          </div>
          <div>
            <Label htmlFor="inviteRole">Role</Label>
            <select
              id="inviteRole"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="squad_captain">Squad Captain</option>
              <option value="vice_captain">Vice Captain</option>
              <option value="captain">Captain</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Label>Assign to Crews</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {squads.map((squad) => (
                <button
                  key={squad.id}
                  type="button"
                  onClick={() => toggleSquad(squad.id)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    selectedSquads.includes(squad.id)
                      ? "bg-blue-100 border-blue-300 text-blue-800"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {squad.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Inviting..." : "Invite Member"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
