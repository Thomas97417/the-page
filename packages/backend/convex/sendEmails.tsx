"use node";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { render } from "@react-email/render";
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

function ResetPasswordEmail({ url }: { url: string }) {
  return (
    <Html>
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
            Votre mot de passe the page
          </Text>
          <Text
            style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}
          >
            Choisissez un nouveau mot de passe pour votre compte.
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
              Réinitialiser le mot de passe
            </Button>
          </Section>
          <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
            Vous n’êtes pas à l’origine de cette demande ? Ignorez cet email.
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
  },
  handler: async (ctx, { from, to, url }) => {
    const html = await render(<ResetPasswordEmail url={url} />);

    await resend.sendEmail(ctx, {
      from,
      to,
      subject: "Votre mot de passe the page",
      html,
    });
  },
});

function VerificationEmail({ url }: { url: string }) {
  return (
    <Html>
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
            Vérifiez votre email — the page
          </Text>
          <Text
            style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}
          >
            Confirmez votre adresse email pour rejoindre the page.
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
              Vérifier mon email
            </Button>
          </Section>
          <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
            Vous n’avez pas créé ce compte ? Ignorez cet email.
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
  },
  handler: async (ctx, { from, to, url }) => {
    const html = await render(<VerificationEmail url={url} />);

    await resend.sendEmail(ctx, {
      from,
      to,
      subject: "Vérifiez votre email — the page",
      html,
    });
  },
});
