const VOICE_REGION_PREFIX = /^(?:HN|SG)\s*[-–—:]\s*/i;
const VOICE_GENDER_SUFFIX =
  /\s*\((?:nam|nữ|male|female|neutral|unknown)\)\s*$/iu;

/**
 * Voice provider names are also used as labels in the selector, for example
 * "SG - Chí Đạt". Only the person's name should be exposed to the interviewer
 * prompt; the region and gender are provider metadata, not a name to speak.
 */
export function getInterviewVoiceName(name?: string): string {
  const normalized = name?.trim().replace(/\s+/g, " ") || "";
  if (!normalized) return "";

  return normalized
    .replace(VOICE_REGION_PREFIX, "")
    .replace(VOICE_GENDER_SUFFIX, "")
    .trim();
}
