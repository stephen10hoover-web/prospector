import Link from 'next/link'
import { Ban } from 'lucide-react'

export const metadata = { title: 'Account Banned — Prospector' }

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-5">
            <Ban className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account Banned</h1>
          <p className="text-muted-foreground">
            Your account has been permanently banned due to a serious violation of our
            Terms of Service. This action is not reversible through self-service.
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 text-sm text-left">
          <p className="font-medium text-red-800 dark:text-red-300 mb-1">Account permanently disabled</p>
          <p className="text-red-700 dark:text-red-400">
            If you believe this is an error, you may contact our support team for a manual review.
            Creating a new account to circumvent this ban is a violation of our Terms and will result
            in immediate termination.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@prospector.app?subject=Account%20Ban%20Review%20Request"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Request Review
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Sign In with Different Account
          </Link>
        </div>
      </div>
    </div>
  )
}
