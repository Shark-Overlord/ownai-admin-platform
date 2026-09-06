package com.yupi.springbootinit.service;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.PointRechargeConfigMapper;
import com.yupi.springbootinit.model.entity.PointRechargeConfig;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class PointRechargeConfigServiceTest {
    @Mock PointRechargeConfigMapper mapper;
    @InjectMocks PointRechargeConfigService service;

    @Test void missingConfigurationFailsClosed() {
        assertThrows(BusinessException.class, () -> service.getConfig());
    }
    @Test void invalidPriceAndLimitsCannotBeSaved() {
        PointRechargeConfig config = valid();
        for (String price : new String[] {"0", "-1", "1.001", "10000.01"}) {
            config.setUnitPrice(new BigDecimal(price));
            assertThrows(BusinessException.class, () -> service.updateConfig(config));
        }
        config.setUnitPrice(BigDecimal.ONE); config.setPointsPerUnit(0);
        assertThrows(BusinessException.class, () -> service.updateConfig(config));
        config.setPointsPerUnit(100); config.setMaxQuantity(1001);
        assertThrows(BusinessException.class, () -> service.updateConfig(config));
        verify(mapper, never()).updateById(any());
    }
    @Test void savesOnlySingletonConfigAndReturnsPersistedValues() {
        PointRechargeConfig config = valid(); config.setId(99L);
        when(mapper.updateById(any())).thenReturn(1);
        when(mapper.selectById(1L)).thenReturn(config);
        assertSame(config, service.updateConfig(config));
        assertEquals(1L, config.getId());
        verify(mapper).updateById(config);
    }
    PointRechargeConfig valid() {
        PointRechargeConfig config = new PointRechargeConfig();
        config.setUnitPrice(BigDecimal.ONE); config.setPointsPerUnit(100);
        config.setMaxQuantity(1000); config.setStatus(1); return config;
    }
}
