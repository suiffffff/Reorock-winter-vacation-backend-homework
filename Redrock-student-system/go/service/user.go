package service

import (
	"errors"
	"system/dao"
	"system/dto"
	"system/models"
	"system/pkg"
	"time"
)

func FindUserName(req *dto.FindUserNameReq) (bool, error) {
	usermodel := models.User{
		Username: req.Username,
	}
	return dao.FindUserName(&usermodel)
}
func AddUser(req *dto.AddUserReq) (*models.User, error) {
	usermodel := models.User{
		Username:   req.Username,
		Password:   pkg.Jiami(req.Password),
		Nickname:   req.Nickname,
		Department: req.Department,
	}
	//需要注意的是这里usermodel成为了一个指针，在dao层创建后会返回User结构的所有值
	err := dao.AddUser(&usermodel)
	if err != nil {
		return nil, err
	}
	return &usermodel, nil
}

func Login(req *dto.LoginReq) (*models.User, string, string, error) {
	usermodel := models.User{
		Username: req.Username,
		Password: pkg.Jiami(req.Password),
	}
	err := dao.Login(&usermodel)
	if err != nil {
		return nil, "", "", err
	}
	accessToken, refreshToken, err := pkg.GenerateTokens(usermodel.ID, usermodel.Role)
	if err != nil {
		return nil, "", "", err
	}
	exp := time.Now().Add(7 * 24 * time.Hour).Unix()
	tokenmodel := models.UserToken{
		UserID:       usermodel.ID,
		RefreshToken: refreshToken,
		ExpiresAt:    exp,
		Revoked:      false,
	}
	if err := dao.StoreRefreshToken(&tokenmodel); err != nil {
		return nil, "", "", err
	}
	return &usermodel, accessToken, refreshToken, nil
}
func CheckRefreshToken(req *dto.CheckAndRefreshTokenReq) error {
	tokenmodel := models.UserToken{
		RefreshToken: req.RefreshToken,
	}
	return dao.CheckRefreshToken(&tokenmodel)
}
func RefreshToken(req *dto.CheckAndRefreshTokenReq) error {
	newExpiresAt := time.Now().Add(time.Hour * 24 * 7).Unix()

	tokenModel := models.UserToken{
		OldRefreshToken: req.RefreshToken,
		RefreshToken:    req.NewRefreshToken,
		ExpiresAt:       newExpiresAt,
	}

	return dao.RefreshToken(&tokenModel)
}

func GetProfile(userID uint64) (*models.User, error) {
	usermodel := models.User{
		ID: userID,
	}
	err := dao.GetProfile(&usermodel)
	if err != nil {
		return nil, err
	}
	return &usermodel, nil
}
func DeleteAccount(userID uint64, req dto.DeleteAccountReq) error {
	usermodel := models.User{
		ID: userID,
	}
	err := dao.GetProfile(&usermodel)
	if err != nil {
		return errors.New("用户不存在")
	}
	if usermodel.Password != pkg.Jiami(req.Password) {
		return errors.New("密码错误")
	}
	return dao.DeleteAccount(&usermodel)
}
