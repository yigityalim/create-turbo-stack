import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface ResetPasswordEmailProps {
  resetUrl: string;
  userEmail: string;
  expiresInMinutes?: number;
  companyName?: string;
}

export function ResetPasswordEmail({
  resetUrl,
  userEmail,
  expiresInMinutes = 30,
  companyName = brand.name,
}: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your password" companyName={companyName}>
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Reset your password
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        We received a request to reset the password for{" "}
        <strong>{userEmail}</strong>. Click the button below to choose a new
        password.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={resetUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Reset password
        </Button>
      </Section>
      <Section className="bg-brand-warnBg rounded-[6px] px-[16px] py-[12px]">
        <Text className="text-[14px] text-brand-warnText m-0 leading-[20px]">
          This link expires in {expiresInMinutes} minutes. If you did not
          request a password reset, your account is safe — you can ignore this
          email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

ResetPasswordEmail.PreviewProps = {
  resetUrl: `${brand.baseUrl}/reset-password?token=preview-token`,
  userEmail: "user@example.com",
  expiresInMinutes: 30,
  companyName: brand.name,
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
