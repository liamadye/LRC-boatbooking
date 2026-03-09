"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { SignupRequestSummary, SquadSummary } from "@/lib/types";

type DraftState = {
  fullName: string;
  role: "member" | "squad_captain" | "vice_captain" | "captain" | "admin";
  memberType: "senior_competitive" | "student" | "recreational";
  squadIds: string[];
};

function getInitialDraft(request: SignupRequestSummary): DraftState {
  return {
    fullName: request.fullName ?? "",
    role: "member",
    memberType: "recreational",
    squadIds: [],
  };
}

function getFallbackDraft(): DraftState {
  return {
    fullName: "",
    role: "member",
    memberType: "recreational",
    squadIds: [],
  };
}

export function SignupRequestReview({
  requests,
  squads,
}: {
  requests: SignupRequestSummary[];
  squads: SquadSummary[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<SignupRequestSummary[]>(requests);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setRows(requests);
    setDrafts((prev) => {
      const next: Record<string, DraftState> = {};
      for (const request of requests) {
        next[request.id] = prev[request.id] ?? getInitialDraft(request);
      }
      return next;
    });
  }, [requests]);

  const pendingRows = useMemo(
    () => rows.filter((request) => request.status === "pending"),
    [rows]
  );

  function updateDraft(requestId: string, update: Partial<DraftState>) {
    const existingRow = rows.find((row) => row.id === requestId) ?? requests.find((row) => row.id === requestId);
    setDrafts((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] ?? (existingRow ? getInitialDraft(existingRow) : getFallbackDraft())),
        ...update,
      },
    }));
  }

  async function reviewRequest(request: SignupRequestSummary, status: "approved" | "denied") {
    const draft = drafts[request.id] ?? getInitialDraft(request);
    if (status === "approved" && draft.fullName.trim().length === 0) {
      toast({
        title: "Full name required",
        description: "Set the member's full name before approval.",
        variant: "destructive",
      });
      return;
    }

    setActionId(`${status}:${request.id}`);
    const res = await fetch(`/api/admin/signup-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        fullName: draft.fullName,
        role: draft.role,
        memberType: draft.memberType,
        squadIds: draft.squadIds,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast({
        title: `Failed to ${status === "approved" ? "approve" : "deny"} request`,
        description: data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActionId(null);
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== request.id));
    toast({
      title: status === "approved" ? "Signup approved" : "Signup denied",
      description:
        status === "approved"
          ? data.approvalEmailSent
            ? "The Google account can now access the portal. An approval email was sent."
            : data.approvalEmailConfigured === false
              ? "The Google account can now access the portal. Approval email is not configured."
              : data.approvalEmailError
                ? `The Google account can now access the portal, but the approval email failed: ${data.approvalEmailError}`
                : "The Google account can now access the portal."
          : "The request has been denied.",
    });
    setActionId(null);
    router.refresh();
  }

  function toggleSquad(requestId: string, squadId: string) {
    const existingRow = rows.find((row) => row.id === requestId) ?? requests.find((row) => row.id === requestId);
    const draft = drafts[requestId] ?? (existingRow ? getInitialDraft(existingRow) : getFallbackDraft());
    const squadIds = draft.squadIds.includes(squadId)
      ? draft.squadIds.filter((id) => id !== squadId)
      : [...draft.squadIds, squadId];

    updateDraft(requestId, { squadIds });
  }

  if (pendingRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Pending Google Sign-ins</h2>
        <p className="text-sm text-muted-foreground">
          First-time Google users land here until an admin approves access and assigns squads.
        </p>
      </div>

      {pendingRows.map((request) => {
        const draft = drafts[request.id] ?? getInitialDraft(request);
        const isBusy = actionId?.endsWith(request.id) ?? false;

        return (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span>{request.fullName ?? "New Google signup"}</span>
                <Badge variant="secondary">Google</Badge>
                <Badge variant="outline">Pending</Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground">{request.email}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Label htmlFor={`signup-name-${request.id}`}>Full name</Label>
                  <Input
                    id={`signup-name-${request.id}`}
                    value={draft.fullName}
                    onChange={(event) => updateDraft(request.id, { fullName: event.target.value })}
                    placeholder="Member full name"
                    disabled={isBusy}
                  />
                </div>
                <div>
                  <Label htmlFor={`signup-role-${request.id}`}>Role</Label>
                  <select
                    id={`signup-role-${request.id}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.role}
                    onChange={(event) => updateDraft(request.id, { role: event.target.value as DraftState["role"] })}
                    disabled={isBusy}
                  >
                    <option value="member">Member</option>
                    <option value="squad_captain">Squad Captain</option>
                    <option value="vice_captain">Vice Captain</option>
                    <option value="captain">Captain</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor={`signup-member-type-${request.id}`}>Member Type</Label>
                  <select
                    id={`signup-member-type-${request.id}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.memberType}
                    onChange={(event) => updateDraft(request.id, { memberType: event.target.value as DraftState["memberType"] })}
                    disabled={isBusy}
                  >
                    <option value="senior_competitive">Senior Competitive</option>
                    <option value="student">Student</option>
                    <option value="recreational">Recreational</option>
                  </select>
                </div>
                <div>
                  <Label>Assign Squads</Label>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2">
                    {squads.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No squads available</span>
                    ) : (
                      squads.map((squad) => (
                        <button
                          key={squad.id}
                          type="button"
                          onClick={() => toggleSquad(request.id, squad.id)}
                          disabled={isBusy}
                          className={`rounded border px-2 py-1 text-xs transition-colors ${
                            draft.squadIds.includes(squad.id)
                              ? "border-blue-300 bg-blue-100 text-blue-800"
                              : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {squad.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => reviewRequest(request, "approved")}
                  disabled={isBusy}
                >
                  {actionId === `approved:${request.id}` ? "Approving..." : "Approve access"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => reviewRequest(request, "denied")}
                  disabled={isBusy}
                >
                  {actionId === `denied:${request.id}` ? "Denying..." : "Deny"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
