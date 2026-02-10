package handler

import (
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
	list, total, err := service.FindHomework(req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询错误")
		return
	}
	var respList []dto.HomeworkItem
	for _, item := range list {
		deptLabel := pkg.GetDepartmentLabel(item.Department)
		reqSub := dto.FindSubmission{
			HomeworkID: item.ID,
		}
		submissionCount, err := service.FindSubmission(reqSub)
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
			SubmissionCount: submissionCount.HomeworkID,
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
