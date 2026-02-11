package handler

import (
	"strconv"
	"system/dto"
	"system/pkg"
	"system/service"

	"github.com/gin-gonic/gin"
)

func AddHomework(c *gin.Context) {
	var req dto.AddHomeworkReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误")
		return
	}
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	user, err := service.GetProfile(userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询身份失败")
		return
	}
	if user.Role != "admin" {
		pkg.Error(c, pkg.CodeParamError, "你不是老登哦，亲")
		return
	}
	homework, err := service.AddHomework(req, userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "创建失败")
		return
	}
	departmentlabel := pkg.GetDepartmentLabel(homework.Department)
	resp := dto.AddHomeworkRes{
		ID:              homework.ID,
		Title:           homework.Title,
		Department:      homework.Department,
		DepartmentLabel: departmentlabel,
		Deadline:        homework.Deadline,
		AllowLate:       homework.AllowLate,
	}
	pkg.Success(c, "发布成功", resp)
}
func FindHomework(c *gin.Context) {
	var req dto.FindHomeworkReq
	if err := c.ShouldBindQuery(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误")
		return
	}
	list, total, err := service.FindHomework(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询错误")
		return
	}
	var respList []dto.HomeworkItem
	for _, item := range list {
		deptLabel := pkg.GetDepartmentLabel(item.Department)
		submissionCount, err := service.FindSubmissionCount(item.ID)
		if err != nil {
			pkg.Error(c, pkg.CodeSystemError, "查询错误")
			return
		}
		respItem := dto.HomeworkItem{
			ID:              item.ID,
			Title:           item.Title,
			Department:      item.Department,
			DepartmentLabel: deptLabel,
			Deadline:        item.Deadline,
			AllowLate:       item.AllowLate,
			SubmissionCount: submissionCount,
			Creator: dto.CreatorInfo{
				ID:       item.Creator.ID,
				Nickname: item.Creator.Username,
			},
		}
		respList = append(respList, respItem)
	}
	resp := dto.FindHomeworkRes{
		List:     respList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}
	pkg.Success(c, "获取成功", resp)
}
func FindHomeworkByID(c *gin.Context) {
	idStr := c.Param("id")
	homeworkID, _ := strconv.ParseUint(idStr, 10, 64)
	homework, err := service.FindHomeworkByID(homeworkID)
	count, _ := service.FindSubmissionCount(homeworkID)
	if err != nil {
		pkg.Error(c, pkg.CodeNotFound, "作业不存在")
		return
	}
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	user, err := service.GetProfile(userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询身份失败")
		return
	}
	var mySubDTO *dto.MySubmissionInfo

	if user.Role != "admin" {
		mySubModel, err := service.FindMySubmission(homeworkID, userID)
		if err == nil {
			mySubDTO = &dto.MySubmissionInfo{
				ID:          mySubModel.ID,
				Score:       mySubModel.Score,
				IsExcellent: mySubModel.IsExcellent,
			}
		}
	}

	creator := dto.CreatorInfo{
		ID:       homework.Creator.ID,
		Nickname: homework.Creator.Nickname,
	}
	resp := dto.FindHomeworkByIDRes{
		ID:              homework.ID,
		Title:           homework.Title,
		Description:     homework.Description,
		Department:      homework.Department,
		DepartmentLabel: pkg.GetDepartmentLabel(homework.Department),
		Creator:         creator,
		Deadline:        homework.Deadline,
		AllowLate:       homework.AllowLate,
		SubmissionCount: count,
		MySubmission:    mySubDTO,
	}
	pkg.Success(c, "获取成功", resp)
}
func UpdateHomework(c *gin.Context) {
	var req dto.UpdateHomeworkReq
	idStr := c.Param("id")
	homeworkID, _ := strconv.ParseUint(idStr, 10, 64)
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误")
		return
	}
	oldHomework, err := service.FindHomeworkByID(homeworkID)
	if err != nil {
		pkg.Error(c, pkg.CodeNotFound, "作业不存在")
		return
	}
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	user, err := service.GetProfile(userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询身份失败")
		return
	}
	if user.Role != "admin" && user.Department != oldHomework.Department {
		pkg.Error(c, pkg.CodeNoPermission, "你无权限修改哦，亲")
		return
	}
	resp, err := service.UpdateHomework(&req, homeworkID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "修改失败")
		return
	}
	pkg.Success(c, "修改成功", resp)
}
func DeleteHomework(c *gin.Context) {
	idStr := c.Param("id")
	homeworkID, _ := strconv.ParseUint(idStr, 10, 64)
	oldHomework, err := service.FindHomeworkByID(homeworkID)
	if err != nil {
		pkg.Error(c, pkg.CodeNotFound, "作业不存在")
		return
	}
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	user, err := service.GetProfile(userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询身份失败")
		return
	}
	if user.Role != "admin" && user.Department != oldHomework.Department {
		pkg.Error(c, pkg.CodeNoPermission, "你无权限修改哦，亲")
		return
	}
	err = service.DeleteHomework(homeworkID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "删除失败")
		return
	}
	pkg.Success(c, "删除成功", nil)
}
