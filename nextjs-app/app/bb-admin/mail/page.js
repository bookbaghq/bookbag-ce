"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MailIndexPage() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mail</CardTitle>
          <CardDescription>Configure and monitor email delivery.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/bb-admin/mail/settings"><Button variant="outline">Settings</Button></Link>
          <Link href="/bb-admin/mail/test"><Button variant="outline">Send Test</Button></Link>
          <Link href="/bb-admin/mail/logs"><Button variant="outline">Email Logs</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}


