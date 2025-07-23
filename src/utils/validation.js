import { z } from 'zod'

export const checkoutSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  
  phone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Please enter a valid US phone number')
    .transform((val) => val.replace(/\D/g, '')),
  
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => {
      const checks = [
        /[a-z]/.test(password), // lowercase
        /[A-Z]/.test(password), // uppercase
        /\d/.test(password),    // numbers
        /[!@#$%^&*(),.?":{}|<>]/.test(password) // symbols
      ]
      return checks.filter(Boolean).length >= 3
    }, 'Password must meet at least 3 of the 4 requirements'),
  
  terms: z.boolean().refine((val) => val === true, 'You must agree to the terms and conditions')
})

export const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'lowercase', label: 'Lower-case letters', regex: /[a-z]/ },
  { id: 'uppercase', label: 'Upper-case letters', regex: /[A-Z]/ },
  { id: 'numbers', label: 'Numbers', regex: /\d/ },
  { id: 'symbols', label: 'Symbols', regex: /[!@#$%^&*(),.?":{}|<>]/ }
]

export function validatePasswordStrength(password) {
  const checks = passwordRequirements.map(req => ({
    ...req,
    passed: req.regex.test(password)
  }))
  
  const passedCount = checks.filter(check => check.passed).length
  return { checks, passedCount, isValid: passedCount >= 3 }
}

export function formatPhoneNumber(value) {
  const cleaned = value.replace(/\D/g, '')
  
  if (cleaned.length <= 3) {
    return cleaned.length > 0 ? `(${cleaned}` : ''
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
  } else {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }
}

export function validatePhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length !== 10) {
    return { isValid: false, message: 'Please enter a valid 10-digit US phone number' }
  }
  
  const areaCode = cleaned.slice(0, 3)
  const exchange = cleaned.slice(3, 6)
  
  if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
    return { isValid: false, message: 'Please enter a valid US phone number' }
  }
  
  if (exchange.startsWith('0') || exchange.startsWith('1')) {
    return { isValid: false, message: 'Please enter a valid US phone number' }
  }
  
  return { isValid: true, cleaned }
}

export function formatZipCode(value) {
  const cleaned = value.replace(/\D/g, '')
  
  if (cleaned.length <= 5) {
    return cleaned
  } else {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`
  }
}

// US States for the dropdown
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
] 