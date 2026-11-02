"use node";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { render } from "@react-email/render";
import { EMAIL_CONTENT } from "./lib/emailContent";
import { normalizeLanguage, type Language } from "./lib/language";
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
} from "@react-email/components";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

function ResetPasswordEmail({ url, language }: { url: string; language: Language }) {
  const copy = EMAIL_CONTENT[language].reset;
  return (
    <Html lang={language}>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "8px",
            margin: "40px auto",
            maxWidth: "480px",
          }}
        >
          <Text
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            {copy.title}
          </Text>
          <Text
            style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}
          >
            {copy.description}
          </Text>
          <Section style={{ textAlign: "center" as const }}>
            <Button
              href={url}
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              {copy.button}
            </Button>
          </Section>
          <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
            {copy.notice}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const sendResetPasswordEmail = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    url: v.string(),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  },
  handler: async (ctx, { from, to, url, language: preference }) => {
    const language = normalizeLanguage(preference);
    const html = await render(<ResetPasswordEmail url={url} language={language} />);

    await resend.sendEmail(ctx, {
      from,
      to,
      subject: EMAIL_CONTENT[language].reset.title,
      html,
    });
  },
});

function VerificationEmail({ url, language }: { url: string; language: Language }) {
  const copy = EMAIL_CONTENT[language].verification;
  return (
    <Html lang={language}>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "8px",
            margin: "40px auto",
            maxWidth: "480px",
          }}
        >
          <Text
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            {copy.title}
          </Text>
          <Text
            style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}
          >
            {copy.description}
          </Text>
          <Section style={{ textAlign: "center" as const }}>
            <Button
              href={url}
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              {copy.button}
            </Button>
          </Section>
          <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
            {copy.notice}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const sendVerificationEmail = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    url: v.string(),
    token: v.string(),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  },
  handler: async (ctx, { from, to, url, language: preference }) => {
    const language = normalizeLanguage(preference);
    const html = await render(<VerificationEmail url={url} language={language} />);

    await resend.sendEmail(ctx, {
      from,
      to,
      subject: EMAIL_CONTENT[language].verification.title,
      html,
    });
  },
});
