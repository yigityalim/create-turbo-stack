import * as React from "react";
import { Heading, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface DeletionCompletedEmailProps {
  userEmail: string;
  deletedAt: string;
  companyName?: string;
}

export function DeletionCompletedEmail({
  userEmail,
  deletedAt,
  companyName = brand.name,
}: DeletionCompletedEmailProps) {
  return (
    <EmailLayout
      preview="Your account has been permanently deleted"
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        Account deleted
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[16px] leading-[24px]">
        The {companyName} account associated with <strong>{userEmail}</strong>{" "}
        was permanently deleted on {deletedAt}.
      </Text>
      <Text className="text-[16px] text-brand-body m-0 mb-[24px] leading-[24px]">
        All your data has been removed from our systems in accordance with our
        data retention policy.
      </Text>
      <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
        If you did not request this deletion or believe this is an error,
        contact support as soon as possible.
      </Text>
    </EmailLayout>
  );
}

DeletionCompletedEmail.PreviewProps = {
  userEmail: "user@example.com",
  deletedAt: "June 5, 2025",
  companyName: brand.name,
} satisfies DeletionCompletedEmailProps;

export default DeletionCompletedEmail;
