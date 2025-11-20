/**
 * Utility to detect and handle API quota/credit errors
 */

export interface QuotaErrorDetails {
    isQuotaError: boolean
    service: string
    message: string
}

/**
 * Check if an error is related to API quota/credits being exhausted
 */
export function detectQuotaError(error: any, serviceName: string): QuotaErrorDetails {
    const errorMessage = error?.message || error?.toString() || ''
    const statusCode = error?.status || error?.statusCode

    // Common quota error patterns
    const quotaPatterns = [
        /quota.*exceeded/i,
        /rate.*limit/i,
        /credit.*exhausted/i,
        /insufficient.*credits/i,
        /trial.*ended/i,
        /trial.*expired/i,
        /free.*tier.*exceeded/i,
        /payment.*required/i,
        /402/,  // Payment Required status code
        /429/,  // Too Many Requests
        /usage.*limit/i,
        /billing/i,
        /subscription.*required/i,
    ]

    const isQuotaError = quotaPatterns.some(pattern =>
        pattern.test(errorMessage) || pattern.test(String(statusCode))
    )

    if (isQuotaError) {
        return {
            isQuotaError: true,
            service: serviceName,
            message: `Your ${serviceName} API credits have been exhausted or your free trial has ended. Please add your own API key to continue using this service.`
        }
    }

    return {
        isQuotaError: false,
        service: serviceName,
        message: ''
    }
}

/**
 * Format user-friendly error message for API errors
 */
export function formatApiError(error: any, serviceName: string): string {
    const quotaError = detectQuotaError(error, serviceName)

    if (quotaError.isQuotaError) {
        return `[Quota Error] ${quotaError.message}`
    }

    return `[Error: ${serviceName}] ${error?.message || 'Transcription failed'}`
}
