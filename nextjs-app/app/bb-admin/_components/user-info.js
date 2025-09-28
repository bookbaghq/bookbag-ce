'use client';

import { useUser } from './user-provider';
import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import { User } from 'lucide-react';

export function UserInfo() {
  // Access the user context
  const { currentUserState } = useUser();
  const { user } = currentUserState;

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>No user information available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className="relative h-12 w-12 overflow-hidden rounded-full">
            {user.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt={user.username}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                <User size={24} />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium">{user.displayNameAs}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
