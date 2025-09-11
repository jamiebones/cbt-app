"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, CenterOption } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentRegNumber: string;
  testCenterOwner: string;
};

export default function StudentSignupPage() {
  const router = useRouter();
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentRegNumber: "",
    testCenterOwner: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await authService.listCenters();
        if (mounted) setCenters(list);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load centers");
      } finally {
        if (mounted) setLoadingCenters(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.testCenterOwner) {
      setError("Please select a test center");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      // Backend requires role-specific fields; include role and center
      await authService.register({
        // Map to backend expected payload
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        // Student-specific
        role: "student" as any,
        firstName: form.firstName,
        lastName: form.lastName,
        studentRegNumber: form.studentRegNumber,
        testCenterOwner: form.testCenterOwner,
      } as any);

      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">Create Student Account</h1>
          <p className="text-slate-600">
            Select your center and fill your details
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign up as Student</CardTitle>
            <CardDescription>
              You'll be able to enroll for active tests at your center.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="studentRegNumber">Student Reg Number</Label>
                <Input
                  id="studentRegNumber"
                  name="studentRegNumber"
                  value={form.studentRegNumber}
                  onChange={onChange}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Test Center</Label>
                <Select
                  value={form.testCenterOwner}
                  onValueChange={(v) =>
                    setForm({ ...form, testCenterOwner: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCenters
                          ? "Loading centers..."
                          : "Select a center"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.testCenterName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={submitting || loadingCenters}
                className="w-full"
              >
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
