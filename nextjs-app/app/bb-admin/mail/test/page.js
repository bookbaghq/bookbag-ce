"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MailTestPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/bb-admin/mail/settings?tab=test");
  }, [router]);
  return null;
}
