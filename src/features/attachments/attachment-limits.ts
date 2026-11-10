/**
 * What may travel with one chat message. The device applies these while it
 * reads a file and the server applies them again, so one place owns them.
 */

/** Files on one message. */
export const MAX_ATTACHMENTS = 3;
/** Biggest file the device will read at all, in bytes. */
export const MAX_FILE_BYTES = 200 * 1024;
/** Characters of file text per message, across all of its files. */
export const MAX_TOTAL_CHARS = 12000;
/** Characters of a file name that reach the server and the model. */
export const MAX_NAME_LENGTH = 100;
