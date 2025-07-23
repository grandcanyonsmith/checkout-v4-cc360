import { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { countries, getUserCountry, formatPhoneNumber, validatePhoneNumber } from '../utils/countries'

export default function PhoneInput({ value, onChange, error, className = '' }) {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Default to US
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingCountry, setIsLoadingCountry] = useState(true)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  // Initialize with IP-based country detection
  useEffect(() => {
    const initializeCountry = async () => {
      try {
        const userCountryCode = await getUserCountry()
        const userCountry = countries.find(c => c.code === userCountryCode)
        if (userCountry) {
          setSelectedCountry(userCountry)
        }
      } catch (error) {
        console.error('Failed to detect user country:', error)
      } finally {
        setIsLoadingCountry(false)
      }
    }

    initializeCountry()
  }, [])

  // Parse existing value on component mount
  useEffect(() => {
    if (value && typeof value === 'string') {
      // Try to parse international format
      const match = value.match(/^(\+\d+)\s*(.*)$/)
      if (match) {
        const dialCode = match[1]
        const phone = match[2]
        const country = countries.find(c => c.dialCode === dialCode)
        if (country) {
          setSelectedCountry(country)
          setPhoneNumber(phone)
        }
      } else {
        // Assume it's just a phone number
        setPhoneNumber(value)
      }
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [isDropdownOpen])

  const handlePhoneNumberChange = (e) => {
    const inputValue = e.target.value
    const formatted = formatPhoneNumber(inputValue, selectedCountry.code)
    setPhoneNumber(formatted)
    
    // Call parent onChange with full international format
    const fullNumber = `${selectedCountry.dialCode} ${formatted}`
    onChange(fullNumber)
  }

  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setIsDropdownOpen(false)
    setSearchTerm('')
    
    // Update the full number with new country code
    const fullNumber = `${country.dialCode} ${phoneNumber}`
    onChange(fullNumber)
  }

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlaceholder = () => {
    switch (selectedCountry.code) {
      case 'US':
      case 'CA':
        return '(555) 123-4567'
      case 'GB':
        return '020 1234 5678'
      case 'DE':
      case 'FR':
      case 'ES':
      case 'IT':
        return '12 34 56 78 90'
      default:
        return 'Phone number'
    }
  }

  return (
    <div className="relative">
      <div className={`flex rounded-lg border ${error ? 'border-red-300' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white ${className}`}>
        {/* Country Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoadingCountry}
            className="flex items-center space-x-2 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-l-lg border-r border-gray-300 min-w-[120px]"
            style={{ backgroundColor: isLoadingCountry ? '#f9fafb' : undefined }}
          >
            {isLoadingCountry ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-gray-500">...</span>
              </div>
            ) : (
              <>
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-gray-900">{selectedCountry.dialCode}</span>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-200">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Country List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-left"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1 text-gray-900">{country.name}</span>
                      <span className="text-gray-500">{country.dialCode}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={getPlaceholder()}
          className="flex-1 px-3 py-3 text-base border-0 rounded-r-lg focus:outline-none focus:ring-0"
          autoComplete="tel"
        />
      </div>
    </div>
  )
} 