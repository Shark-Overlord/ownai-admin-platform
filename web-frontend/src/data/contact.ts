import type {
  ContactContent,
  LegalFooterContent,
  LocalizedText,
} from "@/lib/types";

export const contactContent: ContactContent = {
  wechat: "xh1092968780",
  supportNotice: {
    "en-US": "Add the official WeChat account for support, complaints, refunds, invoices, and account requests.",
    "zh-CN": "咨询、投诉、退款、发票和账号相关申请，请添加官方微信联系。",
  },
};

export const legalFooterContent: LegalFooterContent = {
  icpNumber: {
    "en-US": "Shaan ICP No. 2026025385",
    "zh-CN": "陕ICP备2026025385号",
  },
  icpUrl: "https://beian.miit.gov.cn/",
  legalNotice: {
    "en-US": "Operated in accordance with applicable laws and service rules.",
    "zh-CN": "本站按照适用法律法规及平台规则提供服务。",
  },
  operatorName: {
    "en-US": "Feng County Ciyuan Software Development Studio (Sole Proprietorship)",
    "zh-CN": "凤县词元软件开发工作室（个体工商户）",
  },
  principalName: {
    "en-US": "Xue Hang",
    "zh-CN": "薛航",
  },
};

export const contactPageCopy = {
  "en-US": {
    title: "Contact our team",
    subtitle: "Add our official WeChat account for support and service requests.",
    wechatLabel: "Official WeChat",
    copyLabel: "Copy WeChat ID",
    copiedLabel: "Copied",
  },
  "zh-CN": {
    title: "联系我们团队",
    subtitle: "咨询、投诉、退款、发票或账号问题，请添加官方微信联系。",
    wechatLabel: "官方微信号",
    copyLabel: "复制微信号",
    copiedLabel: "已复制",
  },
} satisfies Record<
  "en-US" | "zh-CN",
  {
    title: string;
    subtitle: string;
    wechatLabel: string;
    copyLabel: string;
    copiedLabel: string;
  }
>;

export function getLocalizedText(
  text: LocalizedText,
  locale: "en-US" | "zh-CN",
) {
  return text[locale];
}
