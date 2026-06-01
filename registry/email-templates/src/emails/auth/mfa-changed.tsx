import * as React from "react";
import { Heading, Link, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export type MfaAction = "enabled" | "disabled";

export interface MfaChangedEmailProps {
  userEmail: string;
  action: MfaAction;
  changedAt: string;
  supportUrl: string;
  companyName?: string;
}

export function MfaChangedEmail({
  userEmail,
  action,
  changedAt,
  supportUrl,
  companyName = brand.name,
}: MfaChangedEmailProps) {
  const isEnabled = action === "enabled";
  return (
    <EmailLayout
      preview={`Two-factor authentication ${action} on your account`}
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Two-factor authentication {isEnabled ? "enabled" : "disabled"}
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        Two-factor authentication was <strong>{action}</strong> on your{" "}
        {companyName} account ({userEmail}) on {changedAt}.
      </Text>
      {isEnabled ? (
        <Text className="text-[16px] text-brand-body m-0 leading-[24px]">
          Your account is now more secure. If you did not make this change,
          contact support at{" "}
          <Link href={supportUrl} className="text-brand-heading underline">
            {supportUrl}
          </Link>
          .
        </Text>
      ) : (
        <Section className="bg-brand-warnBg rounded-[6px] px-[16px] py-[14px]">
          <Text className="text-[14px] text-brand-warnText m-0 leading-[20px]">
            Your account is now less protected. If you did not make this change,
            contact support immediately at{" "}
            <Link href={supportUrl} className="text-brand-warnText underline">
              {supportUrl}
            </Link>
            .
          </Text>
        </Section>
      )}
    </EmailLayout>
  );
}

MfaChangedEmail.PreviewProps = {
  userEmail: "user@example.com",
  action: "enabled" as MfaAction,
  changedAt: "June 5, 2025 at 14:32 UTC",
  supportUrl: `${brand.baseUrl}/support`,
  companyName: brand.name,
} satisfies MfaChangedEmailProps;

export default MfaChangedEmail;
