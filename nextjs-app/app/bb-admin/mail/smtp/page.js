"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MailSmtpPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/bb-admin/mail/settings?tab=smtp");
  }, [router]);
  return null;
}
