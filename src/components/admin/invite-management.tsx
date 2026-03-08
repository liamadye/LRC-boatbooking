"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

type Invitation = {
  id: string;
  email: string;
  token: string;
  role: string;
  memberType: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  inviter: { fullName: string };
};

export function InviteManagement({
  invitations,
}: {
  invitations: Invitation[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [memberType, setMemberType] = useState("recreational");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, memberType }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    } else {
      const inviteUrl = `${window.location.origin}/register?token=${data.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Invitation created",
        description: data.emailSent
          ? "Invitation email sent! Link also copied to clipboard."
          : "Invite link copied to clipboard. Share it with the member.",
      });
      setEmail("");
      router.refresh();
    }

    setLoading(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  }

  const pending = invitations.filter((i) => !i.acceptedAt && new Date(i.expiresAt) > new Date());
  const accepted = invitations.filter((i) => i.acceptedAt);
  const expired = invitations.filter((i) => !i.acceptedAt && new Date(i.expiresAt) <= new Date());

  return (
    <div className="space-y-6 mt-4">
      <form onSubmit={handleInvite} className="flex items-end gap-3 flex-wrap">
        <div>
          <Label htmlFor="inviteEmail">Email</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            required
            className="w-64"
          />
        </div>
        <div>
          <Label htmlFor="inviteRole">Role</Label>
          <select
            id="inviteRole"
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <Label htmlFor="inviteMemberType">Member Type</Label>
          <select
            id="inviteMemberType"
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
          >
            <option value="senior_competitive">Senior Competitive</option>
            <option value="student">Student</option>
            <option value="recreational">Recreational</option>
          </select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Invite"}
        </Button>
      </form>

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Pending ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Invited by {inv.inviter.fullName} —{" "}
                      <Badge variant="outline" className="text-[10px]">{inv.role}</Badge>{" "}
                      <Badge variant="secondary" className="text-[10px]">
                        {inv.memberType.replace("_", " ")}
                      </Badge>
                      {" "}— Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(inv.token)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Accepted ({accepted.length})
          </h3>
          <div className="space-y-2">
            {accepted.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Accepted {new Date(inv.acceptedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-600">Accepted</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Expired ({expired.length})
          </h3>
          <div className="space-y-2">
            {expired.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="font-medium text-muted-foreground">{inv.email}</div>
                  <Badge variant="secondary">Expired</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
