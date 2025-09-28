
import { Sidebar } from "./_components/sidebar"


export default function ManagePage() {
  return (
      <div className="min-h-[calc(100vh-64px)] space-y-6 p-6 md:p-10 bg-background">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and set e-mail preferences.
          </p>
        </div>
        
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

  );
}
