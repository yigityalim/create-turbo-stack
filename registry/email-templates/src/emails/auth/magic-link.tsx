import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface MagicLinkEmailProps {
  magicUrl: string;
  userEmail: string;
  expiresInMinutes?: number;
  companyName?: string;
}

export function MagicLinkEmail({
  magicUrl,
  userEmail,
  expiresInMinutes = 15,
  companyName = brand.name,
}: MagicLinkEmailProps) {
  return (
    <EmailLayout
      preview={`Your sign-in link for ${companyName}`}
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Sign in to {companyName}
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        Click the button below to sign in as <strong>{userEmail}</strong>. This
        link is single-use and expires in {expiresInMinutes} minutes.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={magicUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Sign in
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        If you did not request this link, you can safely ignore this email. Your
        account has not been affected.
      </Text>
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  magicUrl: `${brand.baseUrl}/auth/magic?token=preview-token`,
  userEmail: "user@example.com",
  expiresInMinutes: 15,
  companyName: brand.name,
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;
