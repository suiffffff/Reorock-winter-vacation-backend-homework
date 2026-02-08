package handler

import (
	"system/dto"
	"system/pkg"
	"system/service"

	"github.com/gin-gonic/gin"
)

func FindUserName(c *gin.Context) {
	var req dto.FindUserNameReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "用户名不能为空")
		return
	}
	exists, err := service.FindUserName(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "系统查询错误")
		return
	}
	resp := dto.FindUserNameRes{
		Exist: exists,
	}
	pkg.Success(c, "查询成功", resp)
}
func AddUser(c *gin.Context) {
	var req dto.AddUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误: "+err.Error())
		return
	}
	//一直传指针的话又有点乱，思考了一会还是不传了
	user, err := service.AddUser(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "注册失败: "+err.Error())
		return
	}
	departmentlabel := getDepartmentLabel(user.Department)
	resp := dto.UserInfo{
		ID:              user.ID,
		UserName:        user.Username,
		NickName:        user.Nickname,
		Role:            user.Role,
		Department:      user.Department,
		DepartmentLabel: departmentlabel,
	}
	pkg.Success(c, "注册成功", resp)
}
func Login(c *gin.Context) {
	var req dto.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误")
		return
	}
	user, at, rt, err := service.Login(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "系统查询错误")
		return
	}
	departmentLabel := getDepartmentLabel(user.Department)
	resp := dto.LoginRes{
		AccessToken:  at,
		RefreshToken: rt,
		User: dto.UserInfo{
			ID:              user.ID,
			UserName:        user.Username,
			NickName:        user.Nickname,
			Role:            user.Role,
			Department:      user.Department,
			DepartmentLabel: departmentLabel,
		},
	}
	pkg.Success(c, "登录成功", resp)
}
func RefreshToken(c *gin.Context) {
	var req dto.CheckAndRefreshTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "未查询到你的码呢，亲")
		return
	}
	refreshTokenStr := req.RefreshToken

	claims, err := pkg.VerifyRefreshToken(refreshTokenStr)
	if err != nil {
		pkg.Error(c, pkg.CodeAuthError, "码可能过期了呢，亲")
		return
	}
	err = service.CheckRefreshToken(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeAuthError, err.Error())
		return
	}
	newAccess, newRefresh, err := pkg.GenerateTokens(claims.UserID, claims.Role)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "系统可能超载了，等会再来吧，亲")
		return
	}
	req.NewRefreshToken = newRefresh
	err = service.RefreshToken(&req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "换码失败了，亲")
		return
	}
	resp := dto.RefreshTokenRes{
		AccessToken:  newAccess,
		RefreshToken: newRefresh,
	}
	pkg.Success(c, "刷新成功", resp)
}
func GetProfile(c *gin.Context) {
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	user, err := service.GetProfile(userID)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "查询失败")
		return
	}
	departmentLabel := getDepartmentLabel(user.Department)
	resp := dto.UserInfo{
		ID:              user.ID,
		UserName:        user.Username,
		NickName:        user.Nickname,
		Role:            user.Role,
		Department:      user.Department,
		DepartmentLabel: departmentLabel,
		Email:           user.Email,
	}
	pkg.Success(c, "success", resp)
}
func DeleteAccount(c *gin.Context) {
	var req dto.DeleteAccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, pkg.CodeParamError, "参数错误")
	}
	userID, err := pkg.GetUserID(c)
	if err != nil {
		pkg.ErrorWithStatus(c, 401, pkg.CodeAuthError, err.Error())
		return
	}
	err = service.DeleteAccount(userID, req)
	if err != nil {
		pkg.Error(c, pkg.CodeSystemError, "删除错误，多呆一会呢亲")
		return
	}
	pkg.Success(c, "账号已注销", nil)
}

func getDepartmentLabel(code string) string {
	switch code {
	case "backend":
		return "后端"
	case "frontend":
		return "前端"
	case "sre":
		return "SRE"
	case "product":
		return "产品"
	case "design":
		return "视觉设计"
	case "android":
		return "Android"
	case "ios":
		return "iOS"
	default:
		return "未知部门"
	}
}
