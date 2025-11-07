'use client';

import { ShieldOff, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
              <div className="relative bg-destructive/10 p-6 rounded-full">
                <ShieldOff className="w-16 h-16 text-destructive" strokeWidth={1.5} />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Access Denied
              </h1>
              <p className="text-muted-foreground text-lg">
                You cannot access this page
              </p>
            </div>

            {/* Description */}
            <div className="space-y-4 text-sm text-muted-foreground max-w-sm">
              <p>
                This page is currently unavailable. The client interface has been
                temporarily disabled by system administrators.
              </p>
              <p>
                If you believe this is an error, please contact your system administrator
                for assistance.
              </p>
            </div>

            {/* Error Code */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted px-4 py-2 rounded-md">
              <span>Error Code:</span>
              <span className="font-semibold">CLIENT_ACCESS_DISABLED</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => window.location.href = '/bb-admin'}
              >
                <Home className="mr-2 h-4 w-4" />
                Admin Portal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Need help? Contact your system administrator
        </p>
      </div>
    </div>
  );
}
