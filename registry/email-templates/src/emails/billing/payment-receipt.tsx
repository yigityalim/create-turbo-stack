import * as React from "react";
import { Heading, Hr, Link, Row, Column, Section, Text } from "react-email";
import { EmailLayout } from "../components/layout";
import { brand } from "../tailwind.config";

export interface PaymentReceiptEmailProps {
  userEmail: string;
  /** Pre-formatted amount string, e.g. "$49.00" or "₺1.499,00". */
  amount: string;
  paymentDate: string;
  receiptNumber: string;
  planName: string;
  receiptUrl?: string;
  companyName?: string;
}

export function PaymentReceiptEmail({
  userEmail,
  amount,
  paymentDate,
  receiptNumber,
  planName,
  receiptUrl,
  companyName = brand.name,
}: PaymentReceiptEmailProps) {
  return (
    <EmailLayout
      preview={`Payment receipt — ${amount}`}
      companyName={companyName}
    >
      <Heading className="text-[24px] font-bold text-brand-heading m-0 mb-[8px] leading-[32px]">
        Payment receipt
      </Heading>
      <Text className="text-[16px] text-brand-body m-0 mb-[28px] leading-[24px]">
        Thank you for your payment. Here is a summary for your records.
      </Text>

      {/* Receipt details table */}
      <Section className="bg-brand-bg rounded-[8px] px-[20px] py-[20px] mb-[24px]">
        <Row className="mb-[12px]">
          <Column>
            <Text
              className="text-[13px] text-brand-muted m-0 leading-[18px] uppercase font-semibold"
              style={{ letterSpacing: "0.05em" }}
            >
              Amount
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="text-[20px] font-bold text-brand-heading m-0 leading-[28px] text-right">
              {amount}
            </Text>
          </Column>
        </Row>
        <Hr className="border-none border-t-[1px] border-solid border-brand-border my-[12px]" />
        <Row className="mb-[8px]">
          <Column>
            <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
              Plan
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="text-[14px] text-brand-body m-0 leading-[20px] text-right">
              {planName}
            </Text>
          </Column>
        </Row>
        <Row className="mb-[8px]">
          <Column>
            <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
              Date
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="text-[14px] text-brand-body m-0 leading-[20px] text-right">
              {paymentDate}
            </Text>
          </Column>
        </Row>
        <Row className="mb-[8px]">
          <Column>
            <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
              Receipt
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="text-[14px] text-brand-body m-0 leading-[20px] text-right">
              {receiptNumber}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
              Billed to
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="text-[14px] text-brand-body m-0 leading-[20px] text-right">
              {userEmail}
            </Text>
          </Column>
        </Row>
      </Section>

      {receiptUrl ? (
        <Text className="text-[14px] text-brand-muted m-0 leading-[20px]">
          <Link href={receiptUrl} className="text-brand-heading underline">
            View full receipt
          </Link>
        </Text>
      ) : null}
    </EmailLayout>
  );
}

PaymentReceiptEmail.PreviewProps = {
  userEmail: "user@example.com",
  amount: "$49.00",
  paymentDate: "June 5, 2025",
  receiptNumber: "RCP-2025-00142",
  planName: "Pro Plan — Monthly",
  receiptUrl: `${brand.baseUrl}/billing/receipts/preview`,
  companyName: brand.name,
} satisfies PaymentReceiptEmailProps;

export default PaymentReceiptEmail;
