package dto

type FindUserNameRes struct {
	Exist bool `json:"exist"`
}
type UserInfo struct {
	ID              uint64 `json:"id"`
	UserName        string `json:"username"`
	NickName        string `json:"nickname"`
	Role            string `json:"role"`
	Department      string `json:"department"`
	DepartmentLabel string `json:"department_label"`
}
type AddUserRes struct {
	UserInfo
}
type LoginRes struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}
type RefreshTokenRes struct {
	Message      string `json:"message"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}
