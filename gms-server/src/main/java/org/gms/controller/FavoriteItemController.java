package org.gms.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.gms.constants.api.ApiConstant;
import org.gms.dao.entity.FavoriteItemDO;
import org.gms.model.dto.FavoriteItemReqDTO;
import org.gms.model.dto.ResultBody;
import org.gms.model.dto.SubmitBody;
import org.gms.service.FavoriteItemService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/favoriteItem")
public class FavoriteItemController {
    private final FavoriteItemService favoriteItemService;

    @Tag(name = "/favoriteItem/" + ApiConstant.LATEST)
    @Operation(summary = "查询常用物品，type：5=道具，6=装备")
    @GetMapping("/" + ApiConstant.LATEST)
    public ResultBody<List<FavoriteItemDO>> list(@RequestParam(name = "type", required = false) Integer type) {
        return ResultBody.success(favoriteItemService.list(type));
    }

    @Tag(name = "/favoriteItem/" + ApiConstant.LATEST)
    @Operation(summary = "添加常用物品")
    @PostMapping("/" + ApiConstant.LATEST)
    public ResultBody<Object> add(@RequestBody SubmitBody<FavoriteItemReqDTO> submitBody) {
        FavoriteItemReqDTO data = submitBody.getData();
        favoriteItemService.add(data.getType(), data.getItemId());
        return ResultBody.success();
    }

    @Tag(name = "/favoriteItem/" + ApiConstant.LATEST)
    @Operation(summary = "删除常用物品")
    @DeleteMapping("/" + ApiConstant.LATEST + "/{id}")
    public ResultBody<Object> delete(@PathVariable("id") Integer id) {
        favoriteItemService.delete(id);
        return ResultBody.success();
    }
}
