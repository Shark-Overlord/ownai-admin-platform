import type {
  ContactContent,
  LegalFooterContent,
  LocalizedText,
} from "@/lib/types";

export const contactContent: ContactContent = {
  email: "qq123232016@outlook.com",
  emailLabel: {
    "en-US": "Official email",
    "zh-CN": "联系邮箱",
  },
  emailDescription: {
    "en-US":
      "Use email for support, collaborations, account questions, and filing-related follow-ups.",
    "zh-CN": "问题反馈、合作沟通、账号咨询和备案相关事项，统一通过邮箱联系。",
  },
  supportNotice: {
    "en-US":
      "We currently support email contact only. WeChat is intentionally not provided to reduce account-blocking risk.",
    "zh-CN": "当前仅支持邮箱联系，不提供微信联系方式，以降低账号被封风险。",
  },
};

export const legalFooterContent: LegalFooterContent = {
  icpNumber: {
    "en-US": "Shaan ICP No. 2026012173-1",
    "zh-CN": "陕ICP备2026012173号-1",
  },
  legalNotice: {
    "en-US":
      "Contact and filing information will be finalized before the official launch.",
    "zh-CN": "联系与备案信息以上线前最终披露内容为准。",
  },
};

export const contactPageCopy = {
  "en-US": {
    title: "Contact our team",
    subtitle: "Have a question or feedback? We'd love to hear from you.",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    messageLabel: "Message",
    messagePlaceholder: "What can we help you with?",
    submitLabel: "Send Message",
    submittingLabel: "Sending message...",
    successMessage:
      "Your message has been recorded in this demo flow, real delivery will be connected later",
    nameRequired: "Please enter your name",
    emailRequired: "Please enter your email",
    emailInvalid: "Please enter a valid email address",
    messageRequired: "Please enter your message",
  },
  "zh-CN": {
    title: "联系我们团队",
    subtitle: "有任何问题或反馈？我们很乐意听到你的想法。",
    nameLabel: "姓名",
    namePlaceholder: "你的名字",
    emailLabel: "邮箱",
    emailPlaceholder: "your@email.com",
    messageLabel: "留言内容",
    messagePlaceholder: "我们可以帮你什么？",
    submitLabel: "发送消息",
    submittingLabel: "发送中...",
    successMessage:
      "你的消息已在当前演示流程中记录，后续会接入真实发送通道",
    nameRequired: "请输入姓名",
    emailRequired: "请输入邮箱",
    emailInvalid: "请输入有效的邮箱地址",
    messageRequired: "请输入留言内容",
  },
} satisfies Record<
  "en-US" | "zh-CN",
  {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successMessage: string;
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    messageRequired: string;
  }
>;

export function getLocalizedText(
  text: LocalizedText,
  locale: "en-US" | "zh-CN",
) {
  return text[locale];
}
