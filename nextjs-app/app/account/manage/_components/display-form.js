'use client'

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function DisplayForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>
          Turn items on or off to control what&apos;s displayed in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="compact-mode">Compact Mode</Label>
            <p className="text-xs text-muted-foreground">
              Displays the application with minimal spacing and smaller text.
            </p>
          </div>
          <Switch id="compact-mode" aria-label="Toggle compact mode" />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="media-previews">Media Previews</Label>
            <p className="text-xs text-muted-foreground">
              Display previews for media attachments in your timeline.
            </p>
          </div>
          <Switch id="media-previews" defaultChecked aria-label="Toggle media previews" />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="sidebar">Sidebar</Label>
            <p className="text-xs text-muted-foreground">
              Show or hide the sidebar when in desktop view.
            </p>
          </div>
          <Switch id="sidebar" defaultChecked aria-label="Toggle sidebar" />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="animations">Animations</Label>
            <p className="text-xs text-muted-foreground">
              Enable or disable animations throughout the application.
            </p>
          </div>
          <Switch id="animations" defaultChecked aria-label="Toggle animations" />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="hide-read-items">Hide Read Items</Label>
            <p className="text-xs text-muted-foreground">
              Automatically hide items that you&apos;ve already read.
            </p>
          </div>
          <Switch id="hide-read-items" aria-label="Toggle hide read items" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save display</Button>
      </CardFooter>
    </Card>
  )
}
