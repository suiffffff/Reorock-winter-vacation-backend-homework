package dao

import "system/models"

// 写到这里我开始想，user的model里的数据相当多，那么对于一些要不了那么多字段的功能函数，会出现什么问题？
// 于是有了一个中转的dto层
func AddUser(user *models.User) error {
	return DB.Create(user).Error
}
func FindUserName(username string) (bool, error) {
	var count int64
	err := DB.Model(&models.User{}).Where("username=?", username).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
func Login(user *models.User) error {
	return DB.Create(user).Error
}
func RefreshToken() {
	return
}
