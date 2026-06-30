package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.mapper.YuqueTocMapper;
import com.yupi.springbootinit.model.entity.YuqueToc;
import com.yupi.springbootinit.service.YuqueTocService;
import org.springframework.stereotype.Service;

@Service
public class YuqueTocServiceImpl extends ServiceImpl<YuqueTocMapper, YuqueToc> implements YuqueTocService {
}
