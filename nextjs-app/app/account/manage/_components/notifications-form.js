'use client'

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function NotificationsForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Configure how you receive notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base">Email Notifications</Label>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="email-marketing" />
              <div className="space-y-1 leading-none">
                <Label htmlFor="email-marketing" className="font-normal">Marketing emails</Label>
                <p className="text-xs text-muted-foreground">
                  Receive emails about new products, features, and more.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="email-social" defaultChecked />
              <div className="space-y-1 leading-none">
                <Label htmlFor="email-social" className="font-normal">Social emails</Label>
                <p className="text-xs text-muted-foreground">
                  Receive emails for friend requests, follows, and more.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="email-security" defaultChecked />
              <div className="space-y-1 leading-none">
                <Label htmlFor="email-security" className="font-normal">Security emails</Label>
                <p className="text-xs text-muted-foreground">
                  Receive emails about your account activity and security.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Label className="text-base">Push Notifications</Label>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="push-everything" />
              <div className="space-y-1 leading-none">
                <Label htmlFor="push-everything" className="font-normal">Everything</Label>
                <p className="text-xs text-muted-foreground">
                  Receive all push notifications.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="push-mentions" defaultChecked />
              <div className="space-y-1 leading-none">
                <Label htmlFor="push-mentions" className="font-normal">Mentions</Label>
                <p className="text-xs text-muted-foreground">
                  Receive push notifications when you&apos;re mentioned.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox id="push-none" />
              <div className="space-y-1 leading-none">
                <Label htmlFor="push-none" className="font-normal">Nothing</Label>
                <p className="text-xs text-muted-foreground">
                  Disable all push notifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save preferences</Button>
      </CardFooter>
    </Card>
  )
}
