import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface DataExportReadyEmailProps {
  userEmail: string;
  downloadUrl: string;
  /** Hours until the download link expires. */
  expiresInHours?: number;
  companyName?: string;
}

export function DataExportReadyEmail({
  userEmail,
  downloadUrl,
  expiresInHours = 48,
  companyName = brand.name,
}: DataExportReadyEmailProps) {
  return (
    <EmailLayout
      preview="Your data export is ready to download"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Your data export is ready
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        The data export you requested for <strong>{userEmail}</strong> is ready.
        Click the button below to download your data.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={downloadUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Download my data
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        This download link expires in {expiresInHours} hours. After that, you
        will need to request a new export from your account settings.
      </Text>
    </EmailLayout>
  );
}

DataExportReadyEmail.PreviewProps = {
  userEmail: "user@example.com",
  downloadUrl: `${brand.baseUrl}/exports/download?token=preview-token`,
  expiresInHours: 48,
  companyName: brand.name,
} satisfies DataExportReadyEmailProps;

export default DataExportReadyEmail;
