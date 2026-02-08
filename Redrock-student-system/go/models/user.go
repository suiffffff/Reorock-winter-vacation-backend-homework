package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID         uint64         `gorm:"primaryKey;autoIncrement;" json:"id"`
	Username   string         `gorm:"type:varchar(50);unique;not null;" json:"username"`
	Password   string         `gorm:"type:varchar(255);not null;" json:"-"`
	Nickname   string         `gorm:"type:varchar(50);not null;" json:"nickname"`
	Role       string         `gorm:"type:enum('student','admin');default:'student';" json:"role"`
	Department string         `gorm:"type:enum('backend','frontend','sre','product','design','android','ios')" json:"department"`
	Email      string         `gorm:"type:varchar(100);" json:"email"`
	CreatedAt  time.Time      `gorm:"" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"" json:"-"`
}

type UserToken struct {
	ID           uint64 `gorm:"primaryKey"`
	UserID       uint64 `gorm:"index" json:"user_id"`
	RefreshToken string `gorm:"type:varchar(512);unique" json:"refresh_token"`
	ExpiresAt    int64
	Revoked      bool `gorm:"default:false"`

	OldRefreshToken string `gorm:"-" json:"-"`
}
