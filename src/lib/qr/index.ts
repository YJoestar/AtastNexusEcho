/**
 * NEXUS — QR Library
 *
 * Canonical QR code and manual code resolution pipeline.
 *
 * All QR scanning and manual entry flows through a single validation pipeline
 * that resolves both QR payloads and manual codes to the same canonical
 * ScanLocation record, ensuring client and QA simulator always agree.
 */

export * from './locations'
export * from './payload'
export * from './manualCode'
export * from './validation'
