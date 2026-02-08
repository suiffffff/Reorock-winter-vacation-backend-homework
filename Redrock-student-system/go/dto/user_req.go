package dto

type FindUserNameReq struct {
	Username string `json:"username" binding:"required"`
}
type AddUserReq struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	Nickname   string `json:"nickname" binding:"required"`
	Department string `json:"department" binding:"required,oneof=backend frontend sre product design android ios"`
}
type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}
type CheckAndRefreshTokenReq struct {
	RefreshToken    string `json:"refresh_token" binding:"required"`
	NewRefreshToken string `json:"new_refresh_token"`
}
