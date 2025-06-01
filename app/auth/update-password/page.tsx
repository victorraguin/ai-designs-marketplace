"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import zxcvbn from "zxcvbn";

const supabase = createClient();

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      await supabase.auth.getSession(); // force le chargement
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (password) {
      const score = zxcvbn(password).score;
      setPasswordScore(score);
    }
  }, [password]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (passwordScore < 2) {
      toast.error("Password too weak.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      router.push("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleUpdatePassword}
        className="space-y-4 max-w-sm w-full"
      >
        <h2 className="text-xl font-semibold">Set a new password</h2>

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            type="password"
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <PasswordStrengthBar score={passwordScore} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            type="password"
            id="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}

function PasswordStrengthBar({ score }: { score: number }) {
  const levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-400",
    "bg-green-500",
    "bg-emerald-600",
  ];

  return (
    <div className="w-full mt-2">
      <div className="h-2 w-full bg-gray-700 rounded">
        <div
          className={`h-2 rounded transition-all ${colors[score]}`}
          style={{ width: `${(score + 1) * 20}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{levels[score]}</p>
    </div>
  );
}
