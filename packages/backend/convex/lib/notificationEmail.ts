import type { Doc } from "../_generated/dataModel";
import { EMAIL_CONTENT } from "./emailContent";
import { getPage, pagePath, reclaimPath } from "./pages";

type WordEmail = Pick<Doc<"notifications">, "language" | "word" | "position" | "pageId"> & (
  | Pick<Doc<"notifications">, "kind" | "_id">
  | { kind: "word_hidden" | "word_restored" }
);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function wordNotificationEmail(notification: WordEmail, siteUrl: string) {
  const { kind, language, word, position, pageId } = notification;
  const copy = EMAIL_CONTENT[language][kind];
  const page = getPage(pageId);
  const pageName = language === "fr" ? page.label : page.slug
    .split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const path = kind === "word_replaced"
    ? reclaimPath(pageId, notification._id)
    : pagePath(pageId);
  const url = `${new URL(siteUrl).origin}${path}#word-${position}`;
  const location = `${pageName} · ${copy.position} ${String(position).padStart(2, "0")}`;
  const text = [copy.title, copy.description, `« ${word} »`, location, `${copy.button} : ${url}`, copy.notice].join("\n\n");
  const html = `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f5f1;color:#191919;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;padding:40px 28px;background:#fff">
    <p style="margin:0 0 40px;font-family:Georgia,serif;font-size:26px">the page.</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1.2">${escapeHtml(copy.title)}</h1>
    <p style="font-size:14px;line-height:1.7;color:#555">${escapeHtml(copy.description)}</p>
    <div style="margin:32px 0;padding:24px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd">
      <p style="margin:0 0 12px;font-size:12px;color:#777">${escapeHtml(location)}</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:36px;overflow-wrap:anywhere">${escapeHtml(word)}</p>
    </div>
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;background:#191919;color:#fff;text-decoration:none;font-size:14px">${escapeHtml(copy.button)}</a>
    <p style="margin-top:28px;font-size:12px;line-height:1.7;color:#777">${escapeHtml(copy.notice)}</p>
  </div>
</body></html>`;
  return { subject: `${copy.title} — the page`, html, text };
}
