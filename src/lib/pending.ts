// In-memory hand-off of an attachment from the home composer to the chat page.
export type Attachment = { name: string; mediaType: string; data?: string; text?: string; size: number };
export let pendingAttachment: Attachment | null = null;
export const setPendingAttachment = (a: Attachment | null) => { pendingAttachment = a; };
