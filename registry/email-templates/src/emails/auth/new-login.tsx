import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface NewLoginEmailProps {
  userEmail: string;
  /** Formatted datetime string, e.g. "June 5, 2025 at 14:32 UTC". */
  loginTime: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  secureAccountUrl: string;
  companyName?: string;
}

export function NewLoginEmail({
  userEmail,
  loginTime,
  ipAddress,
  location,
  deviceInfo,
  secureAccountUrl,
  companyName = brand.name,
}: NewLoginEmailProps) {
  return (
    <EmailLayout
      preview="New sign-in to your account"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        New sign-in detected
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        Your {companyName} account ({userEmail}) was just signed in to.
      </Text>
      <Section className="bg-brand-infoBg rounded-[6px] px-[16px] py-[14px] mb-[20px]">
        <Text className="text-[14px] text-brand-infoText m-0 mb-[4px] leading-[20px]">
          <strong>Time:</strong> {loginTime}
        </Text>
        {deviceInfo ? (
          <Text className="text-[14px] text-brand-infoText m-0 mb-[4px] leading-[20px]">
            <strong>Device:</strong> {deviceInfo}
          </Text>
        ) : null}
        {location ? (
          <Text className="text-[14px] text-brand-infoText m-0 mb-[4px] leading-[20px]">
            <strong>Location:</strong> {location}
          </Text>
        ) : null}
        {ipAddress ? (
          <Text className="text-[14px] text-brand-infoText m-0 leading-[20px]">
            <strong>IP address:</strong> {ipAddress}
          </Text>
        ) : null}
      </Section>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        If this was you, no action is needed. If you do not recognise this
        sign-in, secure your account immediately.
      </Text>
      <Section className="mb-[4px]">
        <Button
          href={secureAccountUrl}
          className="bg-[#dc2626] text-white text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Secure my account
        </Button>
      </Section>
    </EmailLayout>
  );
}

NewLoginEmail.PreviewProps = {
  userEmail: "user@example.com",
  loginTime: "June 5, 2025 at 14:32 UTC",
  ipAddress: "203.0.113.42",
  location: "Istanbul, Turkey",
  deviceInfo: "Chrome on macOS",
  secureAccountUrl: `${brand.baseUrl}/account/security`,
  companyName: brand.name,
} satisfies NewLoginEmailProps;

export default NewLoginEmail;
