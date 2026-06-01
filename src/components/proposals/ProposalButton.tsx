'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ProposalButtonProps {
  businessId: string
  businessName: string
  existingProposalId: string | null
}

export function ProposalButton({ businessId, businessName, existingProposalId }: ProposalButtonProps) {
  const [open, setOpen] = useState(false)

  if (existingProposalId) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/leads/${businessId}/proposal`}>
            <FileText className="h-4 w-4 mr-1.5" />
            View Proposal
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/leads/${businessId}/proposal/new`}>
        <FileText className="h-4 w-4 mr-1.5" />
        Create Proposal
      </Link>
    </Button>
  )
}
