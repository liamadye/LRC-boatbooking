"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordRequirements } from "@/components/password-requirements";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/passwords";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setFullName(data.fullName);
      setWeightKg(data.weightKg?.toString() ?? "");
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        weightKg: weightKg ? parseFloat(weightKg) : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      toast({ title: "Profile updated" });
    } else {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-red-600">Profile not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Used for crew weight validation"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Crew average weight must be within ±10% of the boat&apos;s weight rating.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Label>Member Type</Label>
              <Badge variant="secondary">{profile.memberType.replace("_", " ")}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Label>Role</Label>
              <Badge variant="outline">{profile.role}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Label>Black Boat Eligibility</Label>
              <Badge variant={profile.hasBlackBoatEligibility ? "default" : "secondary"}>
                {profile.hasBlackBoatEligibility ? "Approved" : "Not approved"}
              </Badge>
            </div>

            {profile.squads.length > 0 && (
              <div>
                <Label>Squads</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {profile.squads.map((s) => (
                    <Badge key={s.id} variant="outline">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      toast({ title: passwordError, variant: "destructive" });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>
          <PasswordRequirements password={newPassword} />
          <Button type="submit" disabled={saving}>
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
