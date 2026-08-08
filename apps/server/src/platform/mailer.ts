export interface InviteEmail {
  to: string;
  inviteUrl: string;
}

export interface Mailer {
  sendInvite(email: InviteEmail): Promise<void>;
}

// Logging transport: the raw invite link lands in server logs by design —
// this log line IS the delivery until a real transport replaces the
// internals of this file. Nothing outside imports anything but `mailer`.
export const mailer: Mailer = {
  async sendInvite(email: InviteEmail): Promise<void> {
    console.log(`[mailer] invite for ${email.to}: ${email.inviteUrl}`);
  },
};
