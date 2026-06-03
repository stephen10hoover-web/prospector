import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Account Suspended — Prospector' }

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-full p-5">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been temporarily suspended. This may be due to a billing issue,
            a terms of service violation, or a security concern.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-left space-y-2">
          <p className="font-medium">What to do next:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Check your email for a message from our team</li>
            <li>Ensure your billing information is up to date</li>
            <li>Contact support if you believe this is a mistake</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@prospector.app"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Sign In with a Different Account
          </Link>
        </div>
      </div>
    </div>
  )
}
