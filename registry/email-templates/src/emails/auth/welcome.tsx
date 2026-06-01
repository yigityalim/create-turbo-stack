import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
  companyName?: string;
}

export function WelcomeEmail({
  userName,
  loginUrl,
  companyName = brand.name,
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={`Welcome to ${companyName}`}
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Welcome, {userName}!
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        Your account is ready. Click below to sign in and get started.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={loginUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Go to {companyName}
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        If you have any questions, reply to this email — we are happy to help.
      </Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  userName: "Alex Johnson",
  loginUrl: `${brand.baseUrl}/dashboard`,
  companyName: brand.name,
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
