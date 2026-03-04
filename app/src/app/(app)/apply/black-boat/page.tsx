"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function BlackBoatApplicationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [regattaResults, setRegattaResults] = useState("");
  const [ergTimes, setErgTimes] = useState("");
  const [trainingRegime, setTrainingRegime] = useState("");
  const [racingTargets, setRacingTargets] = useState("");
  const [equipmentCareNotes, setEquipmentCareNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/applications/black-boat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regattaResults,
        ergTimes,
        trainingRegime,
        racingTargets,
        equipmentCareNotes,
      }),
    });

    if (res.ok) {
      toast({
        title: "Application submitted",
        description: "The Captain or Committee will review your application.",
      });
      router.push("/profile");
    } else {
      const data = await res.json();
      toast({
        title: "Failed to submit",
        description: data.error,
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Apply for Black Boat Eligibility</CardTitle>
          <p className="text-sm text-muted-foreground">
            Black boats are the Club&apos;s premium racing boats. To gain
            eligibility, you must make a written application to the Captain or
            Committee including the details below.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="regattaResults">
                Regatta Results / Time Trial Results
              </Label>
              <Textarea
                id="regattaResults"
                value={regattaResults}
                onChange={(e) => setRegattaResults(e.target.value)}
                placeholder="List your recent regatta results, time trials, and/or erg times"
                required
              />
            </div>

            <div>
              <Label htmlFor="ergTimes">Erg Times</Label>
              <Textarea
                id="ergTimes"
                value={ergTimes}
                onChange={(e) => setErgTimes(e.target.value)}
                placeholder="e.g. 2k: 7:15, 5k: 19:30"
                required
              />
            </div>

            <div>
              <Label htmlFor="trainingRegime">
                Training Regime &amp; Goals
              </Label>
              <Textarea
                id="trainingRegime"
                value={trainingRegime}
                onChange={(e) => setTrainingRegime(e.target.value)}
                placeholder="Describe your training schedule and identified goals"
                required
              />
            </div>

            <div>
              <Label htmlFor="racingTargets">
                Target Regattas / Championships
              </Label>
              <Textarea
                id="racingTargets"
                value={racingTargets}
                onChange={(e) => setRacingTargets(e.target.value)}
                placeholder="e.g. State Championships, Head of the Yarra, Masters Nationals"
                required
              />
            </div>

            <div>
              <Label htmlFor="equipmentCareNotes">
                Equipment Care Record
              </Label>
              <Textarea
                id="equipmentCareNotes"
                value={equipmentCareNotes}
                onChange={(e) => setEquipmentCareNotes(e.target.value)}
                placeholder="Describe your attention to maintaining and caring for Club equipment"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
