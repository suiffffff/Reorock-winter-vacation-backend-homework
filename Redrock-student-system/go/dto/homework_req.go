package dto

import "time"

type AddHomeworkReq struct {
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description" binding:"required"`
	Department  string    `json:"department" binding:"required"`
	Deadline    time.Time `json:"deadline" binding:"required"`
	AllowLate   bool      `json:"allow_late"`
}
type FindHomeworkReq struct {
	Department string `json:"department"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
}

type UpdateHomeworkReq struct {
	Title       string    `json:"title"`
	Description string    `json:"description" `
	Deadline    time.Time `json:"deadline" `
	AllowLate   bool      `json:"allow_late"`
}
