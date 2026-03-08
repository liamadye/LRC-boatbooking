"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Trash2 } from "lucide-react";

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
  const [inviteRows, setInviteRows] = useState<Invitation[]>(invitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [memberType, setMemberType] = useState("recreational");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setInviteRows(invitations);
  }, [invitations]);

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

  async function resendInvitation(invitation: Invitation) {
    setActionLoadingId(`resend:${invitation.id}`);
    const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      toast({
        title: "Failed to resend invitation",
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActionLoadingId(null);
      return;
    }

    const inviteUrl = `${window.location.origin}/register?token=${data.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteRows((prev) =>
      prev.map((inv) => (inv.id === invitation.id ? (data as Invitation) : inv))
    );
    toast({
      title: "Invitation resent",
      description: data.emailSent
        ? "Invitation email sent and new invite link copied."
        : "Invite renewed and new link copied. Share it manually.",
    });
    setActionLoadingId(null);
    router.refresh();
  }

  async function deleteInvitation(invitation: Invitation) {
    const confirmed = window.confirm(
      `Delete invitation for ${invitation.email}? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setActionLoadingId(`delete:${invitation.id}`);
    const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      toast({
        title: "Failed to delete invitation",
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActionLoadingId(null);
      return;
    }

    setInviteRows((prev) => prev.filter((inv) => inv.id !== invitation.id));
    toast({ title: "Invitation deleted" });
    setActionLoadingId(null);
    router.refresh();
  }

  const pending = inviteRows.filter((i) => !i.acceptedAt && new Date(i.expiresAt) > new Date());
  const accepted = inviteRows.filter((i) => i.acceptedAt);
  const expired = inviteRows.filter((i) => !i.acceptedAt && new Date(i.expiresAt) <= new Date());

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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(inv.token)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionLoadingId === `resend:${inv.id}`}
                      onClick={() => resendInvitation(inv)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={actionLoadingId === `delete:${inv.id}`}
                      onClick={() => deleteInvitation(inv)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
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
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">Expired</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionLoadingId === `resend:${inv.id}`}
                      onClick={() => resendInvitation(inv)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={actionLoadingId === `delete:${inv.id}`}
                      onClick={() => deleteInvitation(inv)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
