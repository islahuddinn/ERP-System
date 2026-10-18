"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
        ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
        ...(formData.address.trim() ? { address: formData.address.trim() } : {}),
      };
      await axios.post("/api/financial/ap/vendors", payload);
      router.push("/dashboard/financial/accounts-payable/vendors");
    } catch (error) {
      console.error("Failed to create vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/financial/accounts-payable/vendors">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Vendor</h1>
          <p className="text-muted-foreground">
            Add a new vendor to your accounts payable system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
          <CardDescription>
            Enter the vendor's basic information. All fields except email and phone are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Vendor"}
              </Button>
              <Link href="/dashboard/financial/accounts-payable/vendors">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
