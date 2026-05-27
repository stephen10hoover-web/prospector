'use client'

import { useEffect, useState } from 'react'
import { checkSpamScore } from '@/lib/spam-checker'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  subject: string
  body: string
}

export function SpamScoreWidget({ subject, body }: Props) {
  const [result, setResult] = useState(() => checkSpamScore(subject, body))

  useEffect(() => {
    setResult(checkSpamScore(subject, body))
  }, [subject, body])

  if (!subject && !body) return null

  const { score, level, issues } = result

  const colors = {
    safe: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200',
  }

  const Icon = level === 'safe' ? CheckCircle : level === 'warning' ? AlertTriangle : XCircle

  return (
    <div className={`rounded-lg border p-3 text-sm ${colors[level]}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 font-medium">
          <Icon className="h-4 w-4" />
          Deliverability:{' '}
          {level === 'safe' ? 'Good' : level === 'warning' ? 'Caution' : 'High Risk'}
        </div>
        <span className="text-xs font-mono">Score {score}/100</span>
      </div>
      {issues.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {issues.slice(0, 4).map((issue, i) => (
            <li key={i} className="text-xs opacity-80">· {issue}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
