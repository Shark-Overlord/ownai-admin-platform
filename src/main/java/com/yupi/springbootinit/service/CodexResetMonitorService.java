package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO;

public interface CodexResetMonitorService {

    CodexResetOverviewVO getOverview();

    void refresh();

    boolean isEnabled();
}
