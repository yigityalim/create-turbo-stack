import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface DeletionRequestedEmailProps {
  userEmail: string;
  /** Days until permanent deletion. */
  gracePeriodDays: number;
  /** Formatted date when deletion will occur. */
  scheduledAt: string;
  /** URL to cancel the deletion request. */
  cancellationUrl: string;
  companyName?: string;
}

export function DeletionRequestedEmail({
  userEmail,
  gracePeriodDays,
  scheduledAt,
  cancellationUrl,
  companyName = brand.name,
}: DeletionRequestedEmailProps) {
  return (
    <EmailLayout
      preview="Your account deletion request has been received"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Account deletion requested
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        We received a request to permanently delete the {companyName} account
        associated with <strong>{userEmail}</strong>.
      </Text>
      <Section className="bg-brand-warnBg rounded-[6px] px-[16px] py-[14px] mb-[24px]">
        <Text className="text-[14px] text-brand-warnText m-0 leading-[20px]">
          Your account and all associated data will be permanently deleted on{" "}
          <strong>{scheduledAt}</strong>. This action cannot be undone.
        </Text>
      </Section>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        If you change your mind, you have{" "}
        <strong>{gracePeriodDays} days</strong> to cancel this request.
      </Text>
      <Section className="mb-[28px]">
        <Button
          href={cancellationUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Cancel deletion
        </Button>
      </Section>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        If you did not request this deletion, contact support immediately.
      </Text>
    </EmailLayout>
  );
}

DeletionRequestedEmail.PreviewProps = {
  userEmail: "user@example.com",
  gracePeriodDays: 30,
  scheduledAt: "July 5, 2025",
  cancellationUrl: `${brand.baseUrl}/account/cancel-deletion?token=preview-token`,
  companyName: brand.name,
} satisfies DeletionRequestedEmailProps;

export default DeletionRequestedEmail;
