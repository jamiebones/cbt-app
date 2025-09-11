"use client";

import React, { useEffect, useState, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { enrollmentService } from "@/services/enrollment";
import { Test } from "@/types";
import { Calendar, Clock, CheckCircle, DollarSign } from "lucide-react";

const StudentActiveTestsPage = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await enrollmentService.listActiveTestsForMyCenter();
        setTests(list);
      } catch (e: any) {
        setError(e.message || "Failed to load active tests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const handleEnroll = async () => {
    if (!selectedTest) return;
    try {
      setEnrolling(true);
      setError(null);
      const { enrollment, paymentData } = await enrollmentService.enrollForTest(
        (selectedTest._id || selectedTest.id) as string
      );

      if (paymentData && paymentData.status === "pending") {
        // Simulate payment by immediately calling pay endpoint
        await enrollmentService.payForEnrollment(enrollment._id, "card");
      }

      setSuccess("Enrollment successful!");
      setSelectedTest(null);
    } catch (e: any) {
      setError(e.message || "Failed to enroll");
    } finally {
      setEnrolling(false);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Cleanup timeout on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ProtectedRoute requiredAuth requiredRoles={["student"]}>
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Active tests you can register for
        </h2>
        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div>Loading…</div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : tests.length === 0 ? (
          <p className="text-gray-600">
            No active tests available in your center.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tests.map((t) => (
              <Card key={(t._id || t.id) as string}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t.title}</span>
                    <Badge>Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.description && (
                    <p className="text-gray-600 text-sm">{t.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4" /> {t.duration} mins
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4" />{" "}
                    {formatDate(t.schedule.startDate)} →{" "}
                    {formatDate(t.schedule.endDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <DollarSign className="h-4 w-4" />{" "}
                    {t.enrollmentConfig?.enrollmentFee || 0}
                  </div>
                  <Dialog
                    open={
                      !!selectedTest &&
                      (selectedTest._id || selectedTest.id) ===
                        ((t._id || t.id) as string)
                    }
                    onOpenChange={(open) => setSelectedTest(open ? t : null)}
                  >
                    <DialogTrigger asChild>
                      <Button className="mt-2">Register</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Registration</DialogTitle>
                        <DialogDescription>
                          {t.enrollmentConfig?.enrollmentFee &&
                          t.enrollmentConfig.enrollmentFee > 0
                            ? `You will be charged ${t.enrollmentConfig.enrollmentFee}. Click confirm to simulate payment and complete registration.`
                            : "This test is free to enroll. Click confirm to complete registration."}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTest(null)}
                          disabled={enrolling}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleEnroll} disabled={enrolling}>
                          {enrolling ? "Processing…" : "Confirm"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default StudentActiveTestsPage;
