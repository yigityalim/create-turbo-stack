import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface VerifyEmailProps {
  verificationUrl: string;
  userEmail: string;
  expiresInMinutes?: number;
  companyName?: string;
}

export function VerifyEmail({
  verificationUrl,
  userEmail,
  expiresInMinutes = 60,
  companyName = brand.name,
}: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email address" companyName={companyName}>
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Verify your email
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        We received a request to verify <strong>{userEmail}</strong> on your{" "}
        {companyName} account. Click the button below to confirm.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={verificationUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Verify email address
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        This link expires in {expiresInMinutes} minutes. If you did not create a{" "}
        {companyName} account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  verificationUrl: `${brand.baseUrl}/verify?token=preview-token`,
  userEmail: "user@example.com",
  expiresInMinutes: 60,
  companyName: brand.name,
} satisfies VerifyEmailProps;

export default VerifyEmail;
