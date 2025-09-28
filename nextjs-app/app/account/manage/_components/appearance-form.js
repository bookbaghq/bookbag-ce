'use client'

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function AppearanceForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the appearance of the app. Automatically switch between day and night themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="block mb-2">Theme</Label>
          <RadioGroup defaultValue="light" className="space-y-1">
            <RadioGroupItem value="light" id="light">
              <Label htmlFor="light" className="ml-2 font-normal">Light</Label>
            </RadioGroupItem>
            <RadioGroupItem value="dark" id="dark">
              <Label htmlFor="dark" className="ml-2 font-normal">Dark</Label>
            </RadioGroupItem>
            <RadioGroupItem value="system" id="system">
              <Label htmlFor="system" className="ml-2 font-normal">System</Label>
            </RadioGroupItem>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-2">
            Select the theme for the dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="block mb-2">Font Size</Label>
          <RadioGroup defaultValue="normal" className="space-y-1">
            <RadioGroupItem value="small" id="small">
              <Label htmlFor="small" className="ml-2 font-normal">Small</Label>
            </RadioGroupItem>
            <RadioGroupItem value="normal" id="normal">
              <Label htmlFor="normal" className="ml-2 font-normal">Normal</Label>
            </RadioGroupItem>
            <RadioGroupItem value="large" id="large">
              <Label htmlFor="large" className="ml-2 font-normal">Large</Label>
            </RadioGroupItem>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-2">
            Adjust the font size for the dashboard.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Update preferences</Button>
      </CardFooter>
    </Card>
  )
}
