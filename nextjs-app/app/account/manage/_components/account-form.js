'use client'

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AccountForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Update your account settings. Set your preferred language and timezone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Your name" />
          <p className="text-xs text-muted-foreground">
            This is the name that will be displayed on your profile and in emails.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of birth</Label>
          <div className="flex items-center space-x-2">
            <Input id="dob" type="date" placeholder="Pick a date" />
          </div>
          <p className="text-xs text-muted-foreground">
            Your date of birth is used to calculate your age.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select defaultValue="en">
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This is the language that will be used in the dashboard.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Update account</Button>
      </CardFooter>
    </Card>
  )
}
