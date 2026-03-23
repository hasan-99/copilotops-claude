/**
 * VAPI Assistant Templates Index
 *
 * Export all assistant templates for easy import.
 */

export { customerServiceAssistant } from './customer-service';
export { appointmentSchedulerAssistant } from './appointment-scheduler';
export { leadQualifierAssistant } from './lead-qualifier';
export { outboundCallerAssistant, outboundPresets } from './outbound-caller';

// Re-export config
export {
  qualiaDefaultConfig,
  voiceProfiles,
  modelProfiles,
  type VapiConfig,
} from '../config/qualia.config';
