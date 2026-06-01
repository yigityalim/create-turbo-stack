import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import tailwindConfig, { brand } from "../tailwind.config";

export interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  companyName?: string;
  /** Absolute URL to your logo PNG. Falls back to text name. */
  logoSrc?: string;
  logoAlt?: string;
  /** Physical address for CAN-SPAM / KVKK footer. */
  companyAddress?: string;
  unsubscribeUrl?: string;
}

export function EmailLayout({
  preview,
  children,
  companyName = brand.name,
  logoSrc = brand.logoSrc,
  logoAlt = brand.logoAlt,
  companyAddress = brand.address,
  unsubscribeUrl,
}: EmailLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <Html lang="en">
      <Tailwind config={tailwindConfig}>
        <Head />
        <Body className="bg-brand-bg font-sans m-0 p-0">
          <Preview>{preview}</Preview>

          <Container className="bg-brand-surface mx-auto my-[40px] rounded-[8px] max-w-[560px]">
            {/* Header — logo or company name */}
            <Section className="px-[40px] pt-[36px] pb-[24px]">
              {logoSrc ? (
                <Img
                  src={logoSrc}
                  alt={logoAlt}
                  width={brand.logoWidth}
                  height={brand.logoHeight}
                  className="block"
                />
              ) : (
                <Text className="text-[18px] font-bold text-brand-heading m-0 leading-[24px] tracking-tight">
                  {companyName}
                </Text>
              )}
            </Section>

            <Hr className="border-none border-t-[1px] border-solid border-brand-border mx-[40px] my-0" />

            {/* Content slot */}
            <Section className="px-[40px] py-[36px]">{children}</Section>

            {/* Footer */}
            <Hr className="border-none border-t-[1px] border-solid border-brand-border mx-[40px] my-0" />
            <Section className="px-[40px] py-[24px]">
              <Text className="text-[12px] text-brand-muted m-0 leading-[18px] text-center">
                {companyAddress}
              </Text>
              <Text className="text-[12px] text-brand-muted mt-[6px] mb-0 text-center">
                {`© ${year} ${companyName}`}
              </Text>
              {unsubscribeUrl ? (
                <Text className="text-[12px] text-brand-muted mt-[6px] mb-0 text-center">
                  <Link
                    href={unsubscribeUrl}
                    className="text-brand-muted underline"
                  >
                    Unsubscribe
                  </Link>
                </Text>
              ) : null}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default EmailLayout;
