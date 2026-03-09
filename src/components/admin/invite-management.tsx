"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SignupRequestReview } from "@/components/admin/signup-request-review";
import { Copy, Mail, RefreshCw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { InvitationSummary, SignupRequestSummary, SquadSummary } from "@/lib/types";

type InviteLinkResponse = {
  inviteUrl: string;
  deliveryMode?: "manual_action_link" | "manual_register_link";
  canEmailFromServer?: boolean;
  mailtoUrl?: string;
  emailSent?: boolean;
  emailConfigured?: boolean;
  error?: string;
};

type InviteDialogState = {
  title: string;
  description: string;
  inviteUrl: string;
  mailtoUrl?: string;
  deliveryMode?: "manual_action_link" | "manual_register_link";
};

export function InviteManagement({
  invitations,
  signupRequests,
  squads,
}: {
  invitations: InvitationSummary[];
  signupRequests: SignupRequestSummary[];
  squads: SquadSummary[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteRows, setInviteRows] = useState<InvitationSummary[]>(invitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [memberType, setMemberType] = useState("recreational");
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState<InviteDialogState | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(["accepted"]));

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  useEffect(() => {
    setInviteRows(invitations);
  }, [invitations]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();

    if (selectedSquadIds.length === 0) {
      const confirmed = window.confirm(
        "No squad has been assigned to this invitation. Are you sure you want to continue without assigning a squad?"
      );
      if (!confirmed) return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, memberType, squadIds: selectedSquadIds }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    } else {
      toast({
        title: "Invitation created",
        description: data.emailSent
          ? "Invitation email sent."
          : "Invite email could not be sent. Share the invite link manually.",
      });
      if (data.inviteUrl && !data.emailSent) {
        showInviteDialog({
          title: "Invite link",
          description: "Server email was not available for this invitation. Share this link directly with the member.",
          inviteUrl: data.inviteUrl,
          deliveryMode: data.deliveryMode,
        });
      }
      setEmail("");
      setSelectedSquadIds([]);
      router.refresh();
    }

    setLoading(false);
  }

  function toggleSquad(squadId: string) {
    setSelectedSquadIds((prev) =>
      prev.includes(squadId)
        ? prev.filter((id) => id !== squadId)
        : [...prev, squadId]
    );
  }

  function showInviteDialog(args: InviteDialogState) {
    setInviteDialog(args);
  }

  async function copyLink(invitation: InvitationSummary) {
    const res = await fetch(`/api/admin/invitations/${invitation.id}`);
    const data = (await res.json()) as InviteLinkResponse & { error?: string };

    if (!res.ok) {
      toast({
        title: "Failed to copy invitation link",
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }

    showInviteDialog({
      title: "Invite link",
      description:
        data.deliveryMode === "manual_action_link"
          ? "Share this direct invite link with the member."
          : "Share this registration link with the member.",
      inviteUrl: data.inviteUrl,
      mailtoUrl: data.mailtoUrl,
      deliveryMode: data.deliveryMode,
    });
  }

  async function resendInvitation(invitation: InvitationSummary) {
    setActionLoadingId(`resend:${invitation.id}`);
    const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery: "link" }),
    });
    const data = (await res.json()) as InviteLinkResponse & InvitationSummary;

    if (!res.ok) {
      toast({
        title: "Failed to resend invitation",
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActionLoadingId(null);
      return;
    }

    setInviteRows((prev) =>
      prev.map((inv) => (inv.id === invitation.id ? (data as InvitationSummary) : inv))
    );
    showInviteDialog({
      title: "Fresh invite link",
      description:
        data.deliveryMode === "manual_action_link"
          ? "This is the renewed invite link. Send it directly to the member."
          : "This is the renewed registration link.",
      inviteUrl: data.inviteUrl,
      mailtoUrl: data.mailtoUrl,
      deliveryMode: data.deliveryMode,
    });
    setActionLoadingId(null);
    router.refresh();
  }

  async function emailInvitation(invitation: InvitationSummary) {
    setActionLoadingId(`email:${invitation.id}`);
    const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery: "email" }),
    });
    const data = (await res.json()) as InviteLinkResponse & InvitationSummary;

    if (!res.ok) {
      toast({
        title: "Failed to email invitation",
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActionLoadingId(null);
      return;
    }

    setInviteRows((prev) =>
      prev.map((inv) => (inv.id === invitation.id ? (data as InvitationSummary) : inv))
    );

    if (data.emailSent) {
      toast({
        title: "Invitation email sent",
        description: `A fresh invite link was emailed to ${invitation.email}.`,
      });
    } else if (data.mailtoUrl) {
      showInviteDialog({
        title: "Email invite",
        description: data.emailConfigured
          ? "The server could not send the invite email. Use the fresh link below or open a prefilled mail draft."
          : "Server-side invite email is not configured. Open a prefilled mail draft or share the fresh link below.",
        inviteUrl: data.inviteUrl,
        mailtoUrl: data.mailtoUrl,
        deliveryMode: data.deliveryMode,
      });
    } else {
      toast({
        title: "Invite email was not sent",
        description: "Use Renew or Copy Link to share the invitation manually.",
        variant: "destructive",
      });
    }

    setActionLoadingId(null);
    router.refresh();
  }

  async function deleteInvitation(invitation: InvitationSummary) {
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
      <SignupRequestReview requests={signupRequests} squads={squads} />

      <form onSubmit={handleInvite} className="space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-3 sm:flex-wrap">
        <div className="flex-1 min-w-0 sm:flex-none">
          <Label htmlFor="inviteEmail">Email</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            required
            className="sm:w-64"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
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
        </div>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Sending..." : "Send Invite"}
        </Button>
      </form>

      <div className="space-y-2">
        <Label>Assign Squads</Label>
        <div className="flex flex-wrap gap-2">
          {squads.map((squad) => (
            <button
              key={squad.id}
              type="button"
              onClick={() => toggleSquad(squad.id)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                selectedSquadIds.includes(squad.id)
                  ? "bg-blue-100 border-blue-300 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {squad.name}
            </button>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection("pending")}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            {collapsedSections.has("pending") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Pending ({pending.length})
          </button>
          {!collapsedSections.has("pending") && <div className="space-y-2">
            {pending.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{inv.email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Invited by {inv.inviter.fullName}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{inv.role}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {inv.memberType.replace("_", " ")}
                        </Badge>
                        {inv.squads.map((squad) => (
                          <Badge key={squad.id} variant="outline" className="text-[10px]">
                            {squad.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => copyLink(inv)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={actionLoadingId === `resend:${inv.id}`}
                      onClick={() => resendInvitation(inv)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Renew
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={actionLoadingId === `email:${inv.id}`}
                      onClick={() => emailInvitation(inv)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email invite again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 text-xs h-7"
                      disabled={actionLoadingId === `delete:${inv.id}`}
                      onClick={() => deleteInvitation(inv)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection("accepted")}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            {collapsedSections.has("accepted") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Accepted ({accepted.length})
          </button>
          {!collapsedSections.has("accepted") && <div className="space-y-2">
            {accepted.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Accepted {new Date(inv.acceptedAt!).toLocaleDateString()}
                      {inv.squads.map((squad) => (
                        <Badge key={squad.id} variant="outline" className="ml-1 text-[10px]">
                          {squad.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-600">Accepted</Badge>
                </CardContent>
              </Card>
            ))}
          </div>}
        </div>
      )}

      {expired.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection("expired")}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            {collapsedSections.has("expired") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Expired ({expired.length})
          </button>
          {!collapsedSections.has("expired") && <div className="space-y-2">
            {expired.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-muted-foreground truncate">{inv.email}</div>
                      {inv.squads.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {inv.squads.map((squad) => (
                            <Badge key={squad.id} variant="outline" className="text-[10px]">
                              {squad.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">Expired</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={actionLoadingId === `resend:${inv.id}`}
                      onClick={() => resendInvitation(inv)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Renew
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={actionLoadingId === `email:${inv.id}`}
                      onClick={() => emailInvitation(inv)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email invite again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 text-xs h-7"
                      disabled={actionLoadingId === `delete:${inv.id}`}
                      onClick={() => deleteInvitation(inv)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
        </div>
      )}

      <Dialog open={!!inviteDialog} onOpenChange={(open) => !open && setInviteDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{inviteDialog?.title}</DialogTitle>
            <DialogDescription>{inviteDialog?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="inviteLinkValue">Invite link</Label>
            <Input
              id="inviteLinkValue"
              value={inviteDialog?.inviteUrl ?? ""}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            {inviteDialog?.deliveryMode === "manual_action_link" && (
              <p className="text-xs text-muted-foreground">
                This is the direct Supabase action link. It is the safest link to send manually.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!inviteDialog?.inviteUrl) {
                  return;
                }
                await navigator.clipboard.writeText(inviteDialog.inviteUrl);
                toast({ title: "Link copied to clipboard" });
              }}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
            {inviteDialog?.mailtoUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = inviteDialog.mailtoUrl!;
                }}
              >
                <Mail className="h-4 w-4" />
                Open mail draft
              </Button>
            )}
            {inviteDialog?.inviteUrl && (
              <Button asChild>
                <a href={inviteDialog.inviteUrl} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
