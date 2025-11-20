"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ApiIndexPage() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Management</CardTitle>
          <CardDescription>Manage API keys, sessions, and configuration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/bb-admin/api/keys"><Button variant="outline">API Keys</Button></Link>
          <Link href="/bb-admin/api/create"><Button variant="outline">Create API Key</Button></Link>
          <Link href="/bb-admin/api/sessions"><Button variant="outline">Sessions</Button></Link>
          <Link href="/bb-admin/api/settings"><Button variant="outline">Settings</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
