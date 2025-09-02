"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mainApi } from "@/services/api";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { API_ENDPOINTS } from "@/utils/config";

const initialForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  testCenterName: "",
  testCenterAddress: {
    street: "",
    city: "",
    state: "",
    country: "",
  },
};

export default function RegisterCenterOwnerPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { state } = useAuth();

  // Only super-admins can access

  if (state.user?.role !== "super_admin") {
    return (
      <Card className="max-w-xl mx-auto mt-12 p-8">
        <div className="text-xl font-bold text-red-600 mb-2">Access Denied</div>
        <div className="text-gray-700">
          Only super admins can register center owners.
        </div>
      </Card>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("testCenterAddress.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        testCenterAddress: {
          ...prev.testCenterAddress,
          [key]: value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Replace with actual API call
      await mainApi.post(API_ENDPOINTS.TEST_CENTER_OWNERS, form);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-12 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Register Test Center Owner</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            placeholder="Phone Number"
            value={form.phoneNumber}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="testCenterName">Test Center Name</Label>
          <Input
            id="testCenterName"
            name="testCenterName"
            required
            placeholder="Test Center Name"
            value={form.testCenterName}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            name="testCenterAddress.street"
            required
            placeholder="Street"
            value={form.testCenterAddress.street}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="testCenterAddress.city"
            required
            placeholder="City"
            value={form.testCenterAddress.city}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="testCenterAddress.state"
            required
            placeholder="State"
            value={form.testCenterAddress.state}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="testCenterAddress.country"
            required
            placeholder="Country"
            value={form.testCenterAddress.country}
            onChange={handleChange}
          />
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? "Registering..." : "Register Center Owner"}
        </Button>
      </form>
    </Card>
  );
}
