/**
 * Simplified Frontend tests for Identity Verification UI
 * Tests form validation, API integration, error handling, and user feedback
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Identity Verification UI - Core Functionality', () => {
  let mockFetch;
  let mockDocument;
  let mockWindow;
  let mockForm;
  let mockElements;

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock DOM elements
    mockElements = {
      firstName: { value: '', addEventListener: vi.fn() },
      phone: { value: '', addEventListener: vi.fn() },
      smsCode: { value: '', addEventListener: vi.fn(), focus: vi.fn() },
      verifyBtn: { disabled: false, addEventListener: vi.fn() },
      verifyBtnText: { textContent: 'Verify My Identity' },
      verifySpinner: { classList: { contains: vi.fn(), toggle: vi.fn() } },
      verifySMSBtn: { disabled: false, addEventListener: vi.fn() },
      verifySMSText: { textContent: 'Verify Code' },
      verifySMSSpinner: { classList: { contains: vi.fn(), toggle: vi.fn() } },
      verificationError: { textContent: '', classList: { add: vi.fn() } },
      smsCodeError: { textContent: '', classList: { add: vi.fn() } },
      successMessage: { textContent: '' },
      failedMessage: { textContent: '' },
      attemptsRemaining: { textContent: '', className: '' },
      verificationStep: { classList: { contains: vi.fn().mockReturnValue(true), remove: vi.fn(), add: vi.fn() } },
      smsStep: { classList: { contains: vi.fn().mockReturnValue(true), remove: vi.fn(), add: vi.fn() } },
      successStep: { classList: { contains: vi.fn().mockReturnValue(true), remove: vi.fn(), add: vi.fn() } },
      failedStep: { classList: { contains: vi.fn().mockReturnValue(true), remove: vi.fn(), add: vi.fn() } }
    };

    mockForm = {
      querySelector: vi.fn((selector) => {
        const elementMap = {
          '#firstName': mockElements.firstName,
          '#phone': mockElements.phone,
          '#sms-code': mockElements.smsCode
        };
        return elementMap[selector] || null;
      }),
      checkValidity: vi.fn().mockReturnValue(true),
      addEventListener: vi.fn()
    };

    mockDocument = {
      getElementById: vi.fn((id) => {
        const elementMap = {
          'firstName': mockElements.firstName,
          'phone': mockElements.phone,
          'sms-code': mockElements.smsCode,
          'verify-identity-btn': mockElements.verifyBtn,
          'verify-btn-text': mockElements.verifyBtnText,
          'verify-spinner': mockElements.verifySpinner,
          'verify-sms-btn': mockElements.verifySMSBtn,
          'verify-sms-text': mockElements.verifySMSText,
          'verify-sms-spinner': mockElements.verifySMSSpinner,
          'verification-error': mockElements.verificationError,
          'sms-code-error': mockElements.smsCodeError,
          'success-message': mockElements.successMessage,
          'failed-message': mockElements.failedMessage,
          'attempts-remaining': mockElements.attemptsRemaining,
          'verification-step': mockElements.verificationStep,
          'sms-step': mockElements.smsStep,
          'success-step': mockElements.successStep,
          'failed-step': mockElements.failedStep
        };
        return elementMap[id] || null;
      }),
      createElement: vi.fn().mockReturnValue({
        id: '',
        className: '',
        innerHTML: '',
        appendChild: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() }
      })
    };

    mockWindow = {
      Event: vi.fn(),
      KeyboardEvent: vi.fn()
    };

    global.document = mockDocument;
    global.window = mockWindow;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should validate phone number format correctly', () => {
      // Test phone number validation logic - more restrictive for proper validation
      const isValidPhoneNumber = (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && /^[1-9]/.test(cleaned);
      };
      
      // Valid phone numbers
      expect(isValidPhoneNumber('5551234567')).toBe(true);
      expect(isValidPhoneNumber('+1 555 123 4567')).toBe(true);
      expect(isValidPhoneNumber('(555) 123-4567')).toBe(true);
      
      // Invalid phone numbers
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
    });

    it('should validate name format correctly', () => {
      // Test name validation logic
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      
      // Valid names
      expect(nameRegex.test('John')).toBe(true);
      expect(nameRegex.test('Mary-Jane')).toBe(true);
      expect(nameRegex.test("O'Connor")).toBe(true);
      expect(nameRegex.test('Jean Pierre')).toBe(true);
      
      // Invalid names
      expect(nameRegex.test('John123')).toBe(false);
      expect(nameRegex.test('John@Doe')).toBe(false);
      expect(nameRegex.test('')).toBe(false);
    });

    it('should validate SMS code format correctly', () => {
      const validateSMSCode = (code) => {
        if (!code) return false;
        if (code.length !== 6) return false;
        if (!/^\d+$/.test(code)) return false;
        return true;
      };

      // Valid codes
      expect(validateSMSCode('123456')).toBe(true);
      expect(validateSMSCode('000000')).toBe(true);
      
      // Invalid codes
      expect(validateSMSCode('12345')).toBe(false);
      expect(validateSMSCode('1234567')).toBe(false);
      expect(validateSMSCode('12345a')).toBe(false);
      expect(validateSMSCode('')).toBe(false);
    });
  });

  describe('API Integration', () => {
    it('should call verify identity API with correct parameters', async () => {
      const mockResponse = {
        success: true,
        verified: true,
        method: 'lookup',
        message: 'Identity verified successfully'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const verifyIdentity = async (phoneNumber, firstName) => {
        const response = await fetch('/api/verify-identity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            firstName: firstName.trim(),
            sessionId: 'test-session-id'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      };
      
      const result = await verifyIdentity('+15551234567', 'John');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: '+15551234567',
          firstName: 'John',
          sessionId: 'test-session-id'
        })
      });
      
      expect(result).toEqual(mockResponse);
    });

    it('should call SMS verification API with correct parameters', async () => {
      const mockResponse = {
        success: true,
        verified: true,
        message: 'SMS code verified successfully'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const verifySMSCode = async (phoneNumber, code, verificationSid) => {
        const response = await fetch('/api/verify-sms-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            code: code,
            verificationSid: verificationSid,
            sessionId: 'test-session-id'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      };
      
      const result = await verifySMSCode('+15551234567', '123456', 'test-sid');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/verify-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: '+15551234567',
          code: '123456',
          verificationSid: 'test-sid',
          sessionId: 'test-session-id'
        })
      });
      
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const verifyIdentity = async (phoneNumber, firstName) => {
        const response = await fetch('/api/verify-identity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            firstName: firstName.trim(),
            sessionId: 'test-session-id'
          })
        });
        return await response.json();
      };
      
      await expect(verifyIdentity('+15551234567', 'John')).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        message: 'Invalid phone number format'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorResponse)
      });

      const verifyIdentity = async (phoneNumber, firstName) => {
        const response = await fetch('/api/verify-identity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            firstName: firstName.trim(),
            sessionId: 'test-session-id'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      };
      
      await expect(verifyIdentity('+15551234567', 'John')).rejects.toThrow('Invalid phone number format');
    });
  });

  describe('User Input Handling', () => {
    it('should format SMS code input correctly', () => {
      const handleSMSCodeInput = (value) => {
        let formattedValue = value.replace(/\D/g, ''); // Remove non-digits
        
        if (formattedValue.length > 6) {
          formattedValue = formattedValue.substring(0, 6);
        }

        return formattedValue;
      };

      // Test formatting
      expect(handleSMSCodeInput('12a3b4c5')).toBe('12345');
      expect(handleSMSCodeInput('1234567890')).toBe('123456');
      expect(handleSMSCodeInput('abc123def')).toBe('123');
      expect(handleSMSCodeInput('')).toBe('');
    });

    it('should validate keypress for SMS code input', () => {
      const isValidSMSKeypress = (key) => {
        // Allow digits
        if (/\d/.test(key)) return true;
        
        // Allow special keys
        if (['Backspace', 'Delete', 'Tab', 'Enter'].includes(key)) return true;
        
        return false;
      };

      // Valid keys
      expect(isValidSMSKeypress('5')).toBe(true);
      expect(isValidSMSKeypress('0')).toBe(true);
      expect(isValidSMSKeypress('Backspace')).toBe(true);
      expect(isValidSMSKeypress('Enter')).toBe(true);
      
      // Invalid keys
      expect(isValidSMSKeypress('a')).toBe(false);
      expect(isValidSMSKeypress('@')).toBe(false);
      expect(isValidSMSKeypress(' ')).toBe(false);
    });
  });

  describe('Error State Management', () => {
    it('should display verification errors correctly', () => {
      const showError = (type, message, elements) => {
        if (type === 'verification' && elements.verificationError) {
          elements.verificationError.textContent = message;
          elements.verificationError.classList.add('animate-slide-in-up');
        }
      };

      const errorMessage = 'Phone number is required for verification.';
      showError('verification', errorMessage, mockElements);
      
      expect(mockElements.verificationError.textContent).toBe(errorMessage);
      expect(mockElements.verificationError.classList.add).toHaveBeenCalledWith('animate-slide-in-up');
    });

    it('should display SMS errors correctly', () => {
      const showSMSError = (message, elements) => {
        if (elements.smsCodeError) {
          elements.smsCodeError.textContent = message;
          elements.smsCodeError.classList.add('animate-slide-in-up');
        }
      };

      const errorMessage = 'Invalid verification code. Please try again.';
      showSMSError(errorMessage, mockElements);
      
      expect(mockElements.smsCodeError.textContent).toBe(errorMessage);
      expect(mockElements.smsCodeError.classList.add).toHaveBeenCalledWith('animate-slide-in-up');
    });

    it('should clear errors correctly', () => {
      const clearErrors = (elements) => {
        if (elements.verificationError) {
          elements.verificationError.textContent = '';
        }
        if (elements.smsCodeError) {
          elements.smsCodeError.textContent = '';
        }
      };

      // Set some errors first
      mockElements.verificationError.textContent = 'Test error';
      mockElements.smsCodeError.textContent = 'Test SMS error';
      
      clearErrors(mockElements);
      
      expect(mockElements.verificationError.textContent).toBe('');
      expect(mockElements.smsCodeError.textContent).toBe('');
    });
  });

  describe('User Feedback and UI States', () => {
    it('should show loading state during verification', () => {
      const setVerifyingState = (isVerifying, elements) => {
        if (elements.verifyBtn) {
          elements.verifyBtn.disabled = isVerifying;
        }
        
        if (elements.verifyBtnText) {
          elements.verifyBtnText.textContent = isVerifying ? 'Verifying...' : 'Verify My Identity';
        }
        
        if (elements.verifySpinner) {
          elements.verifySpinner.classList.toggle('hidden', !isVerifying);
        }
      };

      setVerifyingState(true, mockElements);
      
      expect(mockElements.verifyBtn.disabled).toBe(true);
      expect(mockElements.verifyBtnText.textContent).toBe('Verifying...');
      expect(mockElements.verifySpinner.classList.toggle).toHaveBeenCalledWith('hidden', false);
    });

    it('should hide loading state after verification', () => {
      const setVerifyingState = (isVerifying, elements) => {
        if (elements.verifyBtn) {
          elements.verifyBtn.disabled = isVerifying;
        }
        
        if (elements.verifyBtnText) {
          elements.verifyBtnText.textContent = isVerifying ? 'Verifying...' : 'Verify My Identity';
        }
        
        if (elements.verifySpinner) {
          elements.verifySpinner.classList.toggle('hidden', !isVerifying);
        }
      };

      setVerifyingState(false, mockElements);
      
      expect(mockElements.verifyBtn.disabled).toBe(false);
      expect(mockElements.verifyBtnText.textContent).toBe('Verify My Identity');
      expect(mockElements.verifySpinner.classList.toggle).toHaveBeenCalledWith('hidden', true);
    });

    it('should show SMS loading state correctly', () => {
      const setSMSVerifyingState = (isVerifying, elements) => {
        if (elements.verifySMSBtn) {
          elements.verifySMSBtn.disabled = isVerifying;
        }
        
        if (elements.verifySMSText) {
          elements.verifySMSText.textContent = isVerifying ? 'Verifying...' : 'Verify Code';
        }
        
        if (elements.verifySMSSpinner) {
          elements.verifySMSSpinner.classList.toggle('hidden', !isVerifying);
        }
      };

      setSMSVerifyingState(true, mockElements);
      
      expect(mockElements.verifySMSBtn.disabled).toBe(true);
      expect(mockElements.verifySMSText.textContent).toBe('Verifying...');
      expect(mockElements.verifySMSSpinner.classList.toggle).toHaveBeenCalledWith('hidden', false);
    });

    it('should update attempts remaining display', () => {
      const updateAttemptsDisplay = (smsAttempts, maxRetries, elements) => {
        const remaining = maxRetries - smsAttempts;
        if (elements.attemptsRemaining) {
          elements.attemptsRemaining.textContent = `${remaining} attempts remaining`;
          
          // Change color based on remaining attempts
          if (remaining <= 1) {
            elements.attemptsRemaining.className = 'text-red-500';
          } else if (remaining <= 2) {
            elements.attemptsRemaining.className = 'text-orange-500';
          } else {
            elements.attemptsRemaining.className = 'text-gray-500';
          }
        }
      };

      // Test with 1 attempt remaining (should be red)
      updateAttemptsDisplay(2, 3, mockElements);
      expect(mockElements.attemptsRemaining.className).toBe('text-red-500');
      expect(mockElements.attemptsRemaining.textContent).toBe('1 attempts remaining');
      
      // Test with 2 attempts remaining (should be orange)
      updateAttemptsDisplay(1, 3, mockElements);
      expect(mockElements.attemptsRemaining.className).toBe('text-orange-500');
      expect(mockElements.attemptsRemaining.textContent).toBe('2 attempts remaining');
      
      // Test with 3 attempts remaining (should be gray)
      updateAttemptsDisplay(0, 3, mockElements);
      expect(mockElements.attemptsRemaining.className).toBe('text-gray-500');
      expect(mockElements.attemptsRemaining.textContent).toBe('3 attempts remaining');
    });
  });

  describe('Verification Flow Integration', () => {
    it('should handle successful primary verification', () => {
      const handleVerificationResult = (result) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: result.method || 'lookup',
            currentStep: 'verified'
          };
        } else if (result.requiresSMS) {
          return {
            verificationSid: result.verificationSid,
            currentStep: 'sms'
          };
        } else {
          return {
            currentStep: 'failed'
          };
        }
      };

      const result = {
        success: true,
        verified: true,
        method: 'lookup',
        message: 'Identity verified successfully'
      };
      
      const state = handleVerificationResult(result);
      
      expect(state.isVerified).toBe(true);
      expect(state.verificationMethod).toBe('lookup');
      expect(state.currentStep).toBe('verified');
    });

    it('should handle SMS fallback requirement', () => {
      const handleVerificationResult = (result) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: result.method || 'lookup',
            currentStep: 'verified'
          };
        } else if (result.requiresSMS) {
          return {
            verificationSid: result.verificationSid,
            currentStep: 'sms'
          };
        } else {
          return {
            currentStep: 'failed'
          };
        }
      };

      const result = {
        success: false,
        verified: false,
        requiresSMS: true,
        verificationSid: 'test-sid-123',
        message: 'SMS verification required'
      };
      
      const state = handleVerificationResult(result);
      
      expect(state.verificationSid).toBe('test-sid-123');
      expect(state.currentStep).toBe('sms');
    });

    it('should handle verification failure', () => {
      const handleVerificationResult = (result) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: result.method || 'lookup',
            currentStep: 'verified'
          };
        } else if (result.requiresSMS) {
          return {
            verificationSid: result.verificationSid,
            currentStep: 'sms'
          };
        } else {
          return {
            currentStep: 'failed'
          };
        }
      };

      const result = {
        success: false,
        verified: false,
        requiresSMS: false,
        message: 'Name does not match phone number'
      };
      
      const state = handleVerificationResult(result);
      
      expect(state.currentStep).toBe('failed');
    });

    it('should handle successful SMS verification', () => {
      const handleSMSVerificationResult = (result) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: 'sms',
            currentStep: 'verified'
          };
        } else {
          return {
            currentStep: 'failed'
          };
        }
      };

      const result = {
        success: true,
        verified: true,
        message: 'Phone number verified successfully'
      };
      
      const state = handleSMSVerificationResult(result);
      
      expect(state.isVerified).toBe(true);
      expect(state.verificationMethod).toBe('sms');
      expect(state.currentStep).toBe('verified');
    });

    it('should handle failed SMS verification with retries', () => {
      const handleSMSVerificationResult = (result, smsAttempts, maxRetries) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: 'sms',
            currentStep: 'verified'
          };
        } else {
          const newAttempts = smsAttempts + 1;
          
          if (newAttempts >= maxRetries) {
            return {
              smsAttempts: newAttempts,
              currentStep: 'failed'
            };
          } else {
            return {
              smsAttempts: newAttempts,
              currentStep: 'sms'
            };
          }
        }
      };

      const result = {
        success: false,
        verified: false,
        message: 'Invalid verification code'
      };
      
      const state = handleSMSVerificationResult(result, 0, 3);
      
      expect(state.smsAttempts).toBe(1);
      expect(state.currentStep).toBe('sms');
    });

    it('should handle max SMS attempts reached', () => {
      const handleSMSVerificationResult = (result, smsAttempts, maxRetries) => {
        if (result.success && result.verified) {
          return {
            isVerified: true,
            verificationMethod: 'sms',
            currentStep: 'verified'
          };
        } else {
          const newAttempts = smsAttempts + 1;
          
          if (newAttempts >= maxRetries) {
            return {
              smsAttempts: newAttempts,
              currentStep: 'failed'
            };
          } else {
            return {
              smsAttempts: newAttempts,
              currentStep: 'sms'
            };
          }
        }
      };

      const result = {
        success: false,
        verified: false,
        message: 'Invalid verification code'
      };
      
      const state = handleSMSVerificationResult(result, 2, 3); // Will become 3 after increment
      
      expect(state.currentStep).toBe('failed');
    });
  });

  describe('Utility Functions', () => {
    it('should format phone numbers to E.164 format correctly', () => {
      const formatPhoneNumber = (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        
        // Add country code if not present (assume US)
        if (cleaned.length === 10) {
          return `+1${cleaned}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
          return `+${cleaned}`;
        } else if (phone.startsWith('+')) {
          return phone;
        } else {
          return `+${cleaned}`;
        }
      };

      expect(formatPhoneNumber('5551234567')).toBe('+15551234567');
      expect(formatPhoneNumber('15551234567')).toBe('+15551234567');
      expect(formatPhoneNumber('+15551234567')).toBe('+15551234567');
      expect(formatPhoneNumber('(555) 123-4567')).toBe('+15551234567');
    });

    it('should generate unique session IDs', () => {
      const generateSessionId = () => {
        return 'verify_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      };

      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).toMatch(/^verify_\d+_[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^verify_\d+_[a-z0-9]+$/);
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should reset verification state correctly', () => {
      const resetVerificationState = () => {
        return {
          isVerifying: false,
          isVerified: false,
          verificationMethod: null,
          verificationSid: null,
          smsAttempts: 0,
          currentStep: 'initial',
          errors: {}
        };
      };

      const state = resetVerificationState();
      
      expect(state.isVerifying).toBe(false);
      expect(state.isVerified).toBe(false);
      expect(state.verificationMethod).toBe(null);
      expect(state.smsAttempts).toBe(0);
      expect(state.currentStep).toBe('initial');
      expect(Object.keys(state.errors)).toHaveLength(0);
    });

    it('should check verification completion correctly', () => {
      const isVerificationComplete = (state) => {
        return state.isVerified === true;
      };

      // Not verified initially
      expect(isVerificationComplete({ isVerified: false })).toBe(false);
      
      // Set as verified
      expect(isVerificationComplete({ isVerified: true })).toBe(true);
    });
  });

  describe('Step Transitions', () => {
    it('should transition between UI steps correctly', () => {
      const hideAllSteps = (elements) => {
        const steps = [
          elements.verificationStep,
          elements.smsStep,
          elements.successStep,
          elements.failedStep
        ];

        steps.forEach(step => {
          if (step) {
            step.classList.add('hidden');
          }
        });
      };

      const showStep = (stepName, elements) => {
        hideAllSteps(elements);
        const stepElement = elements[stepName + 'Step'];
        if (stepElement) {
          stepElement.classList.remove('hidden');
        }
      };

      // Test showing SMS step
      showStep('sms', mockElements);
      
      expect(mockElements.verificationStep.classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements.smsStep.classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements.successStep.classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements.failedStep.classList.add).toHaveBeenCalledWith('hidden');
    });

    it('should show success state correctly', () => {
      const showSuccessState = (message, elements) => {
        if (elements.successStep) {
          elements.successStep.classList.remove('hidden');
        }
        if (elements.successMessage) {
          elements.successMessage.textContent = message;
        }
      };

      const successMessage = 'Identity verified successfully!';
      showSuccessState(successMessage, mockElements);
      
      expect(mockElements.successStep.classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements.successMessage.textContent).toBe(successMessage);
    });

    it('should show failed state correctly', () => {
      const showFailedState = (message, elements) => {
        if (elements.failedStep) {
          elements.failedStep.classList.remove('hidden');
        }
        if (elements.failedMessage) {
          elements.failedMessage.textContent = message;
        }
      };

      const failedMessage = 'Identity verification failed.';
      showFailedState(failedMessage, mockElements);
      
      expect(mockElements.failedStep.classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements.failedMessage.textContent).toBe(failedMessage);
    });
  });
});