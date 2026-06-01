import * as React from "react";
import { Heading, Link, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface EmailChangedEmailProps {
  oldEmail: string;
  newEmail: string;
  changedAt: string;
  supportUrl: string;
  companyName?: string;
}

export function EmailChangedEmail({
  oldEmail,
  newEmail,
  changedAt,
  supportUrl,
  companyName = brand.name,
}: EmailChangedEmailProps) {
  return (
    <EmailLayout
      preview="Your email address has been updated"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Email address updated
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        Your {companyName} account email address was changed on {changedAt}.
      </Text>
      <Section className="bg-brand-infoBg rounded-[6px] px-[16px] py-[14px] mb-[20px]">
        <Text className="text-[14px] text-brand-infoText m-0 mb-[4px] leading-[20px]">
          <strong>Previous:</strong> {oldEmail}
        </Text>
        <Text className="text-[14px] text-brand-infoText m-0 leading-[20px]">
          <strong>New:</strong> {newEmail}
        </Text>
      </Section>
      <Section className="bg-brand-warnBg rounded-[6px] px-[16px] py-[14px]">
        <Text className="text-[14px] text-brand-warnText m-0 leading-[20px]">
          If you did not make this change, contact support immediately at{" "}
          <Link href={supportUrl} className="text-brand-warnText underline">
            {supportUrl}
          </Link>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

EmailChangedEmail.PreviewProps = {
  oldEmail: "old@example.com",
  newEmail: "new@example.com",
  changedAt: "June 5, 2025 at 14:32 UTC",
  supportUrl: `${brand.baseUrl}/support`,
  companyName: brand.name,
} satisfies EmailChangedEmailProps;

export default EmailChangedEmail;
