package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkHomeOverviewVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;

public interface ArtworkService extends IService<Artwork> {

    long addArtwork(ArtworkAddRequest artworkAddRequest, User loginUser);

    boolean updateArtwork(ArtworkUpdateRequest artworkUpdateRequest, User loginUser);

    boolean deleteArtwork(long id);

    Page<ArtworkVO> listArtworkVOByPage(ArtworkQueryRequest artworkQueryRequest, User loginUser, boolean adminView);

    ArtworkHomeOverviewVO getHomeOverview(User loginUser);

    ArtworkDetailVO getArtworkDetail(Long artworkId, User loginUser, boolean adminView);

    String getArtworkPromptContent(Long artworkId, User loginUser);

    boolean hasArtworkAccess(Long artworkId, User loginUser);

    void grantArtworkAccess(Long artworkId, Long userId, Long orderId, String accessType);
}
