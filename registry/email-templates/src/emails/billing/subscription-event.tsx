import * as React from "react";
import { Button, Heading, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export type SubscriptionEventType =
  | "started"
  | "renewed"
  | "canceled"
  | "paused"
  | "reactivated";

const EVENT_COPY: Record<
  SubscriptionEventType,
  { subject: string; heading: string; body: string }
> = {
  started: {
    subject: "Your subscription has started",
    heading: "Subscription started",
    body: "Your subscription is now active. You have full access to all features included in your plan.",
  },
  renewed: {
    subject: "Your subscription has been renewed",
    heading: "Subscription renewed",
    body: "Your subscription has been renewed for another period. Your access continues uninterrupted.",
  },
  canceled: {
    subject: "Your subscription has been canceled",
    heading: "Subscription canceled",
    body: "Your subscription has been canceled. You will retain access until the end of your current billing period.",
  },
  paused: {
    subject: "Your subscription has been paused",
    heading: "Subscription paused",
    body: "Your subscription is paused. You will not be charged during this period. Resume anytime from your account settings.",
  },
  reactivated: {
    subject: "Your subscription has been reactivated",
    heading: "Subscription reactivated",
    body: "Your subscription is active again. You have full access to all features included in your plan.",
  },
};

export interface SubscriptionEventEmailProps {
  userEmail: string;
  event: SubscriptionEventType;
  planName: string;
  effectiveDate: string;
  managePlanUrl: string;
  companyName?: string;
}

export function SubscriptionEventEmail({
  userEmail,
  event,
  planName,
  effectiveDate,
  managePlanUrl,
  companyName = brand.name,
}: SubscriptionEventEmailProps) {
  const copy = EVENT_COPY[event];
  return (
    <EmailLayout preview={copy.subject} companyName={companyName}>
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[16px] leading-[32px]">
        {copy.heading}
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[20px] leading-[24px]">
        {copy.body}
      </Text>
      <Section className="bg-brand-bg rounded-[8px] px-[20px] py-[16px] mb-[24px]">
        <Text className="text-[14px] text-brand-muted m-0 mb-[4px] leading-[20px]">
          <strong>Account:</strong> {userEmail}
        </Text>
        <Text className="text-[14px] text-brand-muted m-0 mb-[4px] leading-[20px]">
          <strong>Plan:</strong> {planName}
        </Text>
        <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
          <strong>Effective:</strong> {effectiveDate}
        </Text>
      </Section>
      <Section className="mb-[4px]">
        <Button
          href={managePlanUrl}
          className="bg-brand-primary text-brand-primaryFg text-[16px] font-semibold px-[24px] py-[12px] rounded-[6px] no-underline box-border block text-center"
        >
          Manage plan
        </Button>
      </Section>
    </EmailLayout>
  );
}

SubscriptionEventEmail.PreviewProps = {
  userEmail: "user@example.com",
  event: "renewed" as SubscriptionEventType,
  planName: "Pro Plan — Monthly",
  effectiveDate: "June 5, 2025",
  managePlanUrl: `${brand.baseUrl}/billing`,
  companyName: brand.name,
} satisfies SubscriptionEventEmailProps;

export default SubscriptionEventEmail;
