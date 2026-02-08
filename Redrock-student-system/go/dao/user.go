package dao

import (
	"errors"
	"system/models"
	"time"
)

// 写到这里我开始想，user的model里的数据相当多，那么对于一些要不了那么多字段的功能函数，会出现什么问题？
// 于是有了一个中转的dto层
func FindUserName(user *models.User) (bool, error) {
	var count int64
	username := user.Username
	err := DB.Model(&models.User{}).Where("username=?", username).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
func AddUser(user *models.User) error {
	return DB.Create(user).Error
}
func Login(user *models.User) error {
	username := user.Username
	password := user.Password
	err := DB.Where("username=? AND password=?", username, password).First(user).Error
	return err
}
func StoreRefreshToken(token *models.UserToken) error {
	return DB.Create(token).Error
}
func CheckRefreshToken(token *models.UserToken) error {
	err := DB.Where("refresh_token = ?", token.RefreshToken).First(token).Error
	if err != nil {
		return errors.New("token不存在")
	}
	if token.Revoked {
		return errors.New("token已被撤销")
	}
	if token.ExpiresAt < time.Now().Unix() {
		return errors.New("token已过期")
	}
	return nil
}
func RefreshToken(token *models.UserToken) error {
	return DB.Model(&models.UserToken{}).
		Where("refresh_token = ?", token.OldRefreshToken).
		Updates(map[string]interface{}{
			"refresh_token": token.RefreshToken,
			"expires_at":    token.ExpiresAt,
		}).Error
}
