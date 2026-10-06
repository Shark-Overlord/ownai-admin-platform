import { Link, Navigate, useParams } from "react-router-dom";
import { Footer } from "@/components/home/Footer";
import { Navbar } from "@/components/home/Navbar";
import { contactContent, legalFooterContent } from "@/data/contact";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

const EFFECTIVE_DATE = "2026年10月6日";
const supportWechat = contactContent.wechat;
const operatorName = legalFooterContent.operatorName["zh-CN"];

const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  privacy: {
    title: "隐私政策",
    summary: "说明 OwnAI 在提供账号、内容、交易、社区和图像制作服务时如何处理个人信息。",
    sections: [
      {
        title: "一、个人信息处理者",
        paragraphs: [
          `个人信息处理者：${operatorName}。负责人：${legalFooterContent.principalName["zh-CN"]}。联系微信：${supportWechat}。`,
        ],
      },
      {
        title: "二、我们处理的信息",
        items: [
          "账号信息：注册邮箱、昵称、头像、个人简介以及经加密处理的账号凭证。",
          "使用信息：访问页面、访问时间、IP 地址、浏览器与设备基础信息、站内访客标识、来源域名及 UTM 参数。",
          "内容信息：用户提交的提示词、参考图片、生成任务、收藏、评论、举报和客服沟通内容。",
          "交易信息：订单号、套餐或积分数量、金额、支付状态和必要的支付回调信息；支付账户及付款由支付宝处理。",
        ],
      },
      {
        title: "三、处理目的和方式",
        items: [
          "用于注册登录、身份验证、内容交付、会员与积分管理、订单处理和客户支持。",
          "用于防止欺诈、攻击、滥用以及排查服务故障。",
          "用于访问统计、效果衡量和广告展示；用户可以通过浏览器设置管理非必要存储与第三方广告偏好。",
          "我们遵循合法、正当、必要原则，不以用户同意处理非必要信息作为使用基本功能的条件。",
        ],
      },
      {
        title: "四、委托处理与第三方服务",
        items: [
          "支付宝：处理会员和积分支付、支付结果确认及退款所需信息。",
          "腾讯云对象存储：存储并分发图片、视频、源码包等资源。",
          "邮件服务商：发送注册验证码等必要的账号通知。",
          "Google AdSense：用于广告展示，浏览器可能与 Google 的服务建立连接并按其公开规则处理设备和访问数据。",
          "为完成图像制作任务，必要的提示词、参考图片和任务参数可能发送给页面中实际启用的图像处理服务商。",
        ],
      },
      {
        title: "五、保存与保护",
        items: [
          "账号和业务记录在提供服务所需期间保存；订单、支付和发票记录按法律法规要求保存。",
          "访问及安全日志原则上保存不少于六个月；超过保存期限后删除或匿名化处理，法律法规另有要求的除外。",
          "我们采用访问控制、加密传输、备份和权限隔离等措施保护信息安全。",
        ],
      },
      {
        title: "六、用户权利与账号注销",
        paragraphs: [
          `你可以申请查询、复制、更正、补充或删除个人信息，也可以撤回非必要同意或申请注销账号。请添加官方微信 ${supportWechat}，注明“个人信息请求”或“账号注销申请”，并提供账号邮箱和具体请求。我们会核验身份并原则上在15个工作日内回复。`,
          "账号注销后将停止提供账号服务并处理可删除的信息；为履行法定义务、处理争议和保障交易安全必须保留的订单、支付及安全记录，将在法定或必要期限内限制保存。",
        ],
      },
      {
        title: "七、未成年人",
        paragraphs: [
          "不满十四周岁的用户应在监护人同意和指导下使用服务。若发现未经监护人同意处理了不满十四周岁未成年人的个人信息，我们将在核验后尽快删除或采取其他必要措施。",
        ],
      },
    ],
  },
  terms: {
    title: "用户协议",
    summary: "规定用户注册、平台服务、账号管理、内容责任和争议处理的基本规则。",
    sections: [
      {
        title: "一、协议主体与生效",
        paragraphs: [
          `本协议由用户与${operatorName}共同订立。用户完成勾选并注册、登录或继续使用 OwnAI 服务，即表示已经阅读并同意本协议及相关专项规则。`,
        ],
      },
      {
        title: "二、账号使用",
        items: [
          "用户应提供真实、有效的注册信息并妥善保管账号凭证，不得出租、出借或转让账号。",
          `发现账号被盗用、异常登录或支付异常时，应及时通过官方微信 ${supportWechat} 联系我们。`,
          "用户可以按照隐私政策所列方式申请注销账号；注销前应处理未完成订单和争议。",
        ],
      },
      {
        title: "三、服务内容",
        items: [
          "OwnAI 提供提示词、设计参考、源码资源、教程、社区互动、会员权益、积分消费及图像辅助制作等服务。",
          "具体内容、价格、有效期和交付方式以购买页面和订单确认页展示为准。",
          "平台可为安全、维护或不可抗力原因合理调整服务，并尽量提前告知受影响用户。",
        ],
      },
      {
        title: "四、用户责任",
        items: [
          "不得利用服务制作、上传、复制或传播违法违规、侵害他人权益或危害网络安全的内容。",
          "用户应对输入内容、参考素材以及使用结果的合法性、真实性和授权情况负责。",
          "辅助制作结果仅供参考，用户应在发布、商用或用于重要决策前自行审核。",
        ],
      },
      {
        title: "五、服务处置与申诉",
        paragraphs: [
          `平台发现违法违规、攻击滥用、欺诈或严重违反规则的行为时，可以采取警告、限制功能、暂停或终止服务等措施。用户可添加官方微信 ${supportWechat} 申诉，我们将在核验后反馈处理结果。`,
        ],
      },
      {
        title: "六、争议处理",
        paragraphs: [
          "因本协议产生的争议，双方应先友好协商；协商不成的，可依法向有管辖权的人民法院提起诉讼。消费者依法享有的投诉、举报、调解、仲裁和诉讼权利不受限制。",
        ],
      },
    ],
  },
  "service-rules": {
    title: "服务使用规范",
    summary: "适用于提示词、社区互动和图像辅助制作等功能。",
    sections: [
      {
        title: "一、禁止行为",
        items: [
          "生成或传播危害国家安全、暴力恐怖、淫秽色情、赌博、诈骗、谣言等违法违规内容。",
          "侵犯他人著作权、商标权、肖像权、名誉权、隐私权或个人信息权益。",
          "冒充他人、批量注册、恶意爬取、绕过权限、攻击系统或干扰服务正常运行。",
          "利用辅助生成结果误导公众，或直接用于医疗、法律、金融等高风险自动决策。",
        ],
      },
      {
        title: "二、AI辅助内容提示",
        items: [
          "页面标注为“AI生成”的图片由自动化工具辅助生成，可能存在事实、细节和权利瑕疵。",
          "用户应核验输入素材的授权范围，并在公开发布或商业使用前完成必要审核。",
          "不得恶意删除、篡改或隐匿平台提供的生成内容提示标识。",
        ],
      },
      {
        title: "三、社区规则",
        items: [
          "评论应围绕内容和使用体验展开，不得骚扰、侮辱、发布广告或泄露他人信息。",
          "用户可通过评论旁的举报按钮提交违规线索，平台将结合上下文进行审核。",
          `被限制或删除内容的发布者可通过官方微信 ${supportWechat} 提交申诉。`,
        ],
      },
      {
        title: "四、投诉举报",
        paragraphs: [
          `请添加官方微信 ${supportWechat}，注明相关页面、账号或订单、事实说明和联系方式。我们原则上在7个工作日内回复受理情况；复杂事项会另行说明处理进度。`,
        ],
      },
    ],
  },
  consumer: {
    title: "会员、积分与退款规则",
    summary: "适用于会员开通、积分充值、数字内容交付、退款和发票申请。",
    sections: [
      {
        title: "一、价格与有效期",
        items: [
          "会员和积分均为一次性支付，不设置自动续费或自动扣款。",
          "月度会员自开通后30天有效，年度会员自开通后365天有效，永久会员按购买页面说明持续有效。",
          "积分数量、单价、用途和可购买上限以支付前页面显示为准；积分不计利息，不得私下转让或兑换现金。",
        ],
      },
      {
        title: "二、交付与消费",
        items: [
          "支付成功后，会员权益或积分通常即时到账，可在个人中心订单页面核对。",
          "下载源码、复制会员内容、解锁数字资产或发起消耗积分的任务，均视为相应数字服务已经开始履行。",
          "图像任务失败且系统确认未交付时，已扣积分按系统规则自动退回原账号。",
        ],
      },
      {
        title: "三、退款处理",
        items: [
          "重复付款、支付成功但权益未到账、系统错误扣费或法律规定应退款的情形，可申请核查和退款。",
          "未开始履行的会员或积分订单，可在支付后及时联系客服申请取消；已经下载、复制、解锁、使用会员权益或消耗积分的部分，将结合实际履行情况处理。",
          "退款将尽量原路退回；到账时间取决于支付宝及银行处理进度。平台不得通过本规则排除消费者依法享有的权利。",
        ],
      },
      {
        title: "四、申请方式",
        paragraphs: [
          `请添加官方微信 ${supportWechat}，注明“退款申请”或“支付问题”，并提供订单号、付款时间、金额、问题说明及必要的付款凭证。我们原则上在7个工作日内回复受理情况。`,
        ],
      },
      {
        title: "五、发票",
        paragraphs: [
          `需要发票的用户请添加官方微信 ${supportWechat}，提供订单号、开票抬头、统一社会信用代码、开票金额和接收邮箱。我们会根据实际交易和适用税务规则处理。`,
        ],
      },
    ],
  },
};

export function LegalPage() {
  const { document = "" } = useParams();
  const legalDocument = LEGAL_DOCUMENTS[document];

  if (!legalDocument) return <Navigate to="/legal/privacy" replace />;

  return (
    <div className="page-surface min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <Navbar />
      <main className="mx-auto w-full max-w-[920px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="border-b border-[var(--hero-border)] pb-7">
          <p className="text-[12px] font-medium text-[var(--hero-muted)]">法律与服务规则</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">{legalDocument.title}</h1>
          <p className="mt-3 max-w-[720px] text-[14px] leading-7 text-[var(--hero-muted)]">{legalDocument.summary}</p>
          <p className="mt-3 text-[12px] text-[var(--hero-muted)]">生效日期：{EFFECTIVE_DATE}</p>
        </header>

        <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--hero-muted)]" aria-label="法律文件">
          <Link className="hover:text-[var(--hero-ink)]" to="/legal/privacy">隐私政策</Link>
          <Link className="hover:text-[var(--hero-ink)]" to="/legal/terms">用户协议</Link>
          <Link className="hover:text-[var(--hero-ink)]" to="/legal/service-rules">服务使用规范</Link>
          <Link className="hover:text-[var(--hero-ink)]" to="/legal/consumer">会员、积分与退款规则</Link>
        </nav>

        <article className="mt-8 space-y-9">
          {legalDocument.sections.map((section) => (
            <section key={section.title} className="scroll-mt-24">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[14px] leading-7 text-[var(--hero-muted)]">{paragraph}</p>
              ))}
              {section.items ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-7 text-[var(--hero-muted)]">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <aside className="mt-10 rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 text-[13px] leading-6 text-[var(--hero-muted)]">
          如需咨询、投诉、退款或申请注销账号，请添加官方微信：
          <strong className="ml-1 font-medium text-[var(--hero-ink)]">{supportWechat}</strong>。
        </aside>
      </main>
      <Footer />
    </div>
  );
}
