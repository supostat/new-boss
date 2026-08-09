import nodemailer from "nodemailer";
import { env } from "./env";

export interface InviteEmail {
  to: string;
  inviteUrl: string;
}

export interface Mailer {
  sendInvite(email: InviteEmail): Promise<void>;
}

const transport = nodemailer.createTransport(env.SMTP_URL);

// The raw invite link travels only inside the letter; nothing here may log it.
export const mailer: Mailer = {
  async sendInvite(email: InviteEmail): Promise<void> {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to: email.to,
      subject: "Accept your invite",
      text: `Accept your invite: ${email.inviteUrl}`,
    });
  },
};
