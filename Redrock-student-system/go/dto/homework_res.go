package dto

import (
	"time"
)

type AddHomeworkRes struct {
	ID              uint64    `json:"id"`
	Title           string    `json:"title" binding:"required"`
	Department      string    `json:"department" binding:"required"`
	DepartmentLabel string    `json:"department_label"`
	Deadline        time.Time `json:"deadline" binding:"required"`
	AllowLate       bool      `json:"allow_late"`
}
type CreatorInfo struct {
	ID       uint64 `json:"id"`
	Nickname string `json:"nickname"`
}
type HomeworkItem struct {
	ID              uint64      `json:"id"`
	Title           string      `json:"title"`
	Department      string      `json:"department"`
	DepartmentLabel string      `json:"department_label"`
	Creator         CreatorInfo `json:"creator"`
	Deadline        time.Time   `json:"deadline"`
	AllowLate       bool        `json:"allow_late"`
	SubmissionCount int64       `json:"submission_count"`
}
type FindHomeworkRes struct {
	List     []HomeworkItem `json:"list"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
}

type FindHomeworkByIDRes struct {
	ID              uint64            `json:"id"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	Department      string            `json:"department"`
	DepartmentLabel string            `json:"department_label"`
	Creator         CreatorInfo       `json:"creator"`
	Deadline        time.Time         `json:"deadline"`
	AllowLate       bool              `json:"allow_late"`
	SubmissionCount int64             `json:"submission_count"`
	MySubmission    *MySubmissionInfo `json:"my_submission"`
}
type UpdateHomeworkRes struct {
	ID       uint64    `json:"id"`
	Title    string    `json:"title"`
	Deadline time.Time `json:"deadline"`
}
