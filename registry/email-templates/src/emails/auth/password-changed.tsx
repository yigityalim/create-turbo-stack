import * as React from "react";
import { Heading, Link, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface PasswordChangedEmailProps {
  userEmail: string;
  changedAt: string;
  supportUrl: string;
  companyName?: string;
}

export function PasswordChangedEmail({
  userEmail,
  changedAt,
  supportUrl,
  companyName = brand.name,
}: PasswordChangedEmailProps) {
  return (
    <EmailLayout
      preview="Your password has been changed"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Password changed
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        The password for your {companyName} account ({userEmail}) was changed on{" "}
        {changedAt}.
      </Text>
      <Section className="bg-brand-warnBg rounded-[6px] px-[16px] py-[14px] mb-[20px]">
        <Text className="text-[14px] text-brand-warnText m-0 leading-[20px]">
          If you did not make this change, contact support immediately at{" "}
          <Link href={supportUrl} className="text-brand-warnText underline">
            {supportUrl}
          </Link>
          .
        </Text>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        If this was you, no action is needed. Your account is secure.
      </Text>
    </EmailLayout>
  );
}

PasswordChangedEmail.PreviewProps = {
  userEmail: "user@example.com",
  changedAt: "June 5, 2025 at 14:32 UTC",
  supportUrl: `${brand.baseUrl}/support`,
  companyName: brand.name,
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;
