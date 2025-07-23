import { cn } from '../utils/cn'

export default function FormField({ 
  label, 
  required = false, 
  error, 
  success, 
  className,
  children 
}) {
  return (
    <div className={cn('form-group', className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {children}
      
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      
      {success && !error && (
        <div className="success-message">
          {success}
        </div>
      )}
    </div>
  )
} 