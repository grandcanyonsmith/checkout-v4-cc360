import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { passwordRequirements } from '../utils/validation'
import { cn } from '../utils/cn'

export default function PasswordStrength({ password, strength }) {
  if (!password) return null

  return (
    <div className="mt-3 rounded-lg bg-primary-50 p-4 border border-primary-200 animate-slide-in">
      <p className="text-sm font-medium text-primary-800 mb-3">
        Your password must contain:
      </p>
      
      <ul className="space-y-2 text-sm">
        {strength.checks.map((check) => (
          <li 
            key={check.id}
            className={cn(
              'flex items-center transition-colors duration-200',
              check.passed ? 'text-green-600' : 'text-red-600'
            )}
          >
            {check.passed ? (
              <CheckCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
} 