package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID         uint64         `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Username   string         `gorm:"type:varchar(50);unique;not null;column:username" json:"username"`
	Password   string         `gorm:"type:varchar(255);not null;column:password" json:"-"`
	Nickname   string         `gorm:"type:varchar(50);not null;column:nickname" json:"nickname"`
	Role       string         `gorm:"type:enum('student','admin');default:'student';column:role" json:"role"`
	Department string         `gorm:"type:enum('backend','frontend','sre','product','design','android','ios';column:department" json:"department"`
	Email      string         `gorm:"type:varchar(100);column:email" json:"email"`
	CreatedAt  time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"column:update_at" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"column:deleted_at" json:"-"`
}
