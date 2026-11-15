package com.yupi.springbootinit.mcp;

import java.util.List;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * OwnAI 设计灵感库（免登录公开版）专用 MCP 工具集。
 * 仅暴露 4 个 100% 免费、完整可用、无任何付费墙截断的高价值设计与动效工具，
 * 挂载在独立的 /mcp/free/sse 端点，确保免授权场景下工具描述与实际产出 1:1 严格一致。
 */
@Component
public class OwnAiFreeDesignTools {

    private final OwnAiDesignTools delegate;

    public OwnAiFreeDesignTools(OwnAiDesignTools delegate) {
        this.delegate = delegate;
    }

    @Tool(description = "按业务场景、终端设备（app / website）与视觉风格检索 5 个精选 UI 设计作品灵感（返回作品标题、高清封面图 coverUrl、设计方向摘要与核心构件清单）。AI 必须使用 ![作品名](coverUrl) 渲染封面截图供用户直观参考；若用户要求「换一批」，请将 page 递增并传入已展示的 excludeTitles。")
    public List<OwnAiDesignTools.ArtworkSearchResult> find_design_artworks(
            @ToolParam(description = "业务场景，如: 电商, 社交/聊天, SaaS仪表盘, 官网, 音乐, 个人博客", required = false) String scenario,
            @ToolParam(description = "设备载体: app (移动端) 或 website (网页端)", required = false) String device,
            @ToolParam(description = "视觉风格: 极简, 暗黑, 玻璃拟态, 渐变霓虹, 粗野主义", required = false) String style,
            @ToolParam(description = "自由搜索词", required = false) String keyword,
            @ToolParam(description = "页码/批次（默认 1。「换一批」时递增为 2、3 等）", required = false) Integer page,
            @ToolParam(description = "需要排除的作品名称列表（逗号分隔，避免重复推荐）", required = false) String excludeTitles,
            @ToolParam(description = "返回条数，默认 5，最大 10", required = false) Integer limit) {
        return delegate.find_design_artworks(scenario, device, style, keyword, page, excludeTitles, limit);
    }

    @Tool(description = "获取完整的 UI 设计系统规范与全局设计语言 Tokens（包含 HEX 色彩色盘 colorPalette、字体字阶 typography、间距圆角 layout、微动效参数 motionTokens 以及可直接用于前端代码生成的完整 Markdown System Prompt）。")
    public OwnAiDesignTools.DesignSystemSpec get_design_system(
            @ToolParam(description = "业务场景，如: 电商, 社交, SaaS, 移动端设计", required = false) String scenario,
            @ToolParam(description = "设备类型: app (移动端) 或 website (桌面端)", required = false) String device,
            @ToolParam(description = "视觉风格，如: 极简, 暗黑, 纸质质感, 赛博朋克, 玻璃拟态", required = false) String style,
            @ToolParam(description = "模糊作品名称或关键词，如: Claude, 灵动岛, SaaS看板", required = false) String keyword) {
        return delegate.get_design_system(scenario, device, style, keyword);
    }

    @Tool(description = "检索开箱即用的交互微动效与物理动画参数预设（Motion Presets）。支持弹簧弹性展开、触觉按压反馈、列表级联交错入场、Bento 卡片悬停浮起、底部抽屉阻尼与流光呼吸等场景，直接返回可复制的 Framer Motion 配置、Tailwind CSS 动画类名与 CSS cubic-bezier 缓动曲线。")
    public List<OwnAiDesignTools.MotionPresetResult> find_motion_presets(
            @ToolParam(description = "动效交互意图，如: 灵动岛弹簧展开, 按钮按压微交互, 列表交错飞入, 卡片悬停浮起, 模态框升起") String motionIntent,
            @ToolParam(description = "技术栈偏好: framer-motion, tailwind-css, css-bezier", required = false) String techStack,
            @ToolParam(description = "设备类型: app 或 website", required = false) String device) {
        return delegate.find_motion_presets(motionIntent, techStack, device);
    }

    @Tool(description = "按视觉风格、应用场景与目标工具检索免费公开的高品质提示词模板（包含前端 UI 生成规范、中英文完整 Prompt 以及 coverUrl 视觉效果图，可使用 ![效果图](coverUrl) 直接展示）。")
    public List<OwnAiDesignTools.PromptTemplateResult> find_prompts_for_creation(
            @ToolParam(description = "视觉风格，如: 极简扁平, 3D质感, 深色科技, 纸质质感, 赛博朋克", required = false) String visualStyle,
            @ToolParam(description = "应用场景，如: 产品海报, App界面, 网页Hero, 商业插画, 封面", required = false) String scenario,
            @ToolParam(description = "自由关键词", required = false) String keyword,
            @ToolParam(description = "目标工具: frontend-ui (代码生成), midjourney, flux, dall-e", required = false) String targetTool,
            @ToolParam(description = "返回条数，默认 5，最大 20", required = false) Integer limit) {
        return delegate.find_prompts_for_creation(visualStyle, scenario, keyword, targetTool, limit);
    }
}
