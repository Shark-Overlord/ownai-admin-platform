package com.yupi.springbootinit.service.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CodexResetMonitorParserTest {

    @Test
    void parsesLatestHistoryAnnouncementsAndStats() {
        String html = """
                <html><body>
                  <section class="product-reset-detail-card">
                    <div class="product-reset-detail-latest">
                      <span data-signal-reset-status="confirmed">已重置</span>
                      <span class="product-tracking-signal-label">全员重置</span>
                      <strong>本轮重置已经确认</strong>
                      <time datetime="2026-09-27T02:17:00.000Z">2026-09-27 10:17</time>
                    </div>
                    <a href="https://x.com/example/status/300">查看</a>
                  </section>
                  <div>
                    <a data-kind="hard" data-has-event="true" aria-label="2026-09-20：全员重置" href="https://x.com/example/status/100"></a>
                    <a data-kind="banked" data-has-event="true" aria-label="2026-09-23：发重置卡" href="https://x.com/example/status/200"></a>
                    <a data-kind="hard" data-has-event="true" aria-label="2026-09-27：全员重置" href="https://x.com/example/status/300"></a>
                  </div>
                  <article class="module__announcement">
                    <span class="module__relative">刚刚</span>
                    <time datetime="2026-09-27T02:17:00.000Z">2026-09-27 10:17</time>
                    <p class="module__summary">Reset complete</p>
                    <a href="https://x.com/example/status/300">查看</a>
                  </article>
                </body></html>
                """;

        CodexResetOverviewVO result = new CodexResetMonitorParser().parse(
                html,
                "https://example.com/codex",
                Instant.parse("2026-09-27T03:00:00Z")
        );

        assertNotNull(result.getLatestSignal());
        assertEquals("300", result.getLatestSignal().getId());
        assertEquals("reset", result.getLatestSignal().getKind());
        assertEquals(3, result.getHistory().size());
        assertEquals(1, result.getAnnouncements().size());
        assertEquals(2, result.getStats().getResetCount());
        assertEquals(7.0, result.getStats().getAverageIntervalDays());
        assertEquals(7.0, result.getStats().getLongestIntervalDays());
    }

    @Test
    void parsesEveryEventFromCompleteHistoryApi() {
        String json = """
                {
                  "slug": "codex",
                  "history": {
                    "range": {"startDate": "2026-06-01", "endDate": "2026-09-30"},
                    "days": [
                      {
                        "dateKey": "2026-06-18",
                        "events": [
                          {
                            "id": "internal-1",
                            "subtype": "hard_banked_reset",
                            "labelZh": "全员重置 + 发重置卡",
                            "summaryZh": "执行双重重置",
                            "occurredAtIso": "2026-06-18T00:10:10Z",
                            "relativeTime": "101 天前",
                            "originalUrl": "https://x.com/thsottiaux/status/100",
                            "resetKinds": ["hard", "banked"],
                            "status": "executed"
                          }
                        ]
                      },
                      {
                        "dateKey": "2026-06-22",
                        "events": [
                          {
                            "id": "internal-2",
                            "subtype": "banked_reset",
                            "labelZh": "发重置卡",
                            "summaryZh": "存入重置额度",
                            "occurredAtIso": "2026-06-21T20:23:46Z",
                            "relativeTime": "97 天前",
                            "originalUrl": "https://x.com/thsottiaux/status/200",
                            "resetKinds": ["banked"],
                            "status": "executed"
                          },
                          {
                            "id": "internal-3",
                            "subtype": "hard_reset",
                            "labelZh": "全员重置",
                            "summaryZh": "再次全员重置",
                            "occurredAtIso": "2026-06-22T08:00:00Z",
                            "relativeTime": "96 天前",
                            "originalUrl": "https://x.com/thsottiaux/status/300",
                            "resetKinds": ["hard"],
                            "status": "scheduled"
                          }
                        ]
                      }
                    ]
                  }
                }
                """;

        CodexResetOverviewVO result = new CodexResetMonitorParser().parseHistoryJson(
                json,
                "https://betteropc.com/ai-products/reset-signals/codex",
                Instant.parse("2026-09-27T03:00:00Z")
        );

        assertNotNull(result.getLatestSignal());
        assertEquals("300", result.getLatestSignal().getId());
        assertEquals(3, result.getHistory().size());
        assertEquals(3, result.getAnnouncements().size());
        assertEquals("reset", result.getHistory().get(0).getKind());
        assertEquals("reset_card", result.getHistory().get(1).getKind());
        assertEquals(2, result.getStats().getResetCount());
        assertEquals("全员重置 · 再次全员重置", result.getAnnouncements().get(0).getSummary());
    }
}
