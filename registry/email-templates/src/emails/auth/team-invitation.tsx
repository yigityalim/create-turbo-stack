import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface TeamInvitationEmailProps {
  inviterName: string;
  teamName: string;
  invitationUrl: string;
  expiresInDays?: number;
  companyName?: string;
}

export function TeamInvitationEmail({
  inviterName,
  teamName,
  invitationUrl,
  expiresInDays = 7,
  companyName = brand.name,
}: TeamInvitationEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${teamName}`}
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        You have been invited
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        <strong>{inviterName}</strong> has invited you to join the{" "}
        <strong>{teamName}</strong> workspace on {companyName}.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={invitationUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Accept invitation
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        This invitation expires in {expiresInDays} days. If you were not
        expecting an invitation, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

TeamInvitationEmail.PreviewProps = {
  inviterName: "Alex Johnson",
  teamName: "Acme Engineering",
  invitationUrl: `${brand.baseUrl}/invite?token=preview-token`,
  expiresInDays: 7,
  companyName: brand.name,
} satisfies TeamInvitationEmailProps;

export default TeamInvitationEmail;
