package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.model.dto.category.CategoryQueryRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.service.CategoryService;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CategoryControllerTest {

    private MockMvc mockMvc;

    private CategoryService categoryService;

    @BeforeEach
    void setUp() {
        categoryService = Mockito.mock(CategoryService.class);
        CategoryController categoryController = new CategoryController();
        org.springframework.test.util.ReflectionTestUtils.setField(categoryController, "categoryService", categoryService);
        mockMvc = MockMvcBuilders.standaloneSetup(categoryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listCategoryShouldReturnSuccess() throws Exception {
        Category category = new Category();
        category.setId(1L);
        category.setName("AI Art");
        CategoryVO categoryVO = new CategoryVO();
        categoryVO.setId(1L);
        categoryVO.setName("AI Art");
        when(categoryService.getQueryWrapper(any(CategoryQueryRequest.class))).thenReturn(new QueryWrapper<>());
        when(categoryService.list(any(QueryWrapper.class))).thenReturn(Collections.singletonList(category));
        when(categoryService.getCategoryVO(any(List.class))).thenReturn(Collections.singletonList(categoryVO));

        mockMvc.perform(get("/category/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[0].name").value("AI Art"));
    }

    @Test
    void listCategoryByPageShouldReturnPagedResult() throws Exception {
        Page<CategoryVO> categoryVOPage = new Page<>(1, 10, 1);
        categoryVOPage.setRecords(Collections.singletonList(new CategoryVO()));
        Page<Category> categoryPage = new Page<>(1, 10, 1);
        categoryPage.setRecords(Collections.singletonList(new Category()));
        when(categoryService.getQueryWrapper(any(CategoryQueryRequest.class))).thenReturn(new QueryWrapper<>());
        when(categoryService.page(any(Page.class), any(QueryWrapper.class))).thenReturn(categoryPage);
        when(categoryService.getCategoryVO(any(List.class))).thenReturn(Collections.singletonList(new CategoryVO()));

        mockMvc.perform(post("/category/list/page")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"current\":1,\"pageSize\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }
}
