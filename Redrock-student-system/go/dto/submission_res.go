package dto

import "time"

// 作业额外接口
type MySubmissionInfo struct {
	ID          uint64 `json:"id"`
	Score       *int   `json:"score"`
	IsExcellent bool   `json:"is_excellent"`
}

// 提交接口
type SubmitHomeworkRes struct {
	ID          uint64    `json:"id"`
	HomeworkID  uint64    `json:"homework_id"`
	IsLate      bool      `json:"is_late"`
	SubmittedAt time.Time `json:"submitted_at"`
}
type HomeworkMsg struct {
	ID              uint64 `json:"id"`
	Title           string `json:"title"`
	Department      string `json:"department"`
	DepartmentLabel string `json:"department_label"`
}
type SubmissionItem struct {
	ID          uint64      `json:"id"`
	Homework    HomeworkMsg `json:"homework"`
	Score       *int        `json:"score"`
	Comment     string      `json:"comment"`
	IsExcellent bool        `json:"is_excellent"`
	SubmittedAt time.Time   `json:"submitted_at"`
}
type FindAllMySubmitRes struct {
	List     []SubmissionItem `json:"list"`
	Total    uint64           `json:"total"`
	Page     uint64           `json:"page"`
	PageSize uint64           `json:"page_size"`
}

type StudentItem struct {
	ID              uint64 `json:"id"`
	NickName        string `json:"nick_name"`
	Department      string `json:"department"`
	DepartmentLabel string `json:"department_label"`
}
type CommitItem struct {
	ID          uint64      `json:"id"`
	Student     StudentItem `json:"student"`
	Content     string      `json:"content"`
	IsLate      bool        `json:"is_late"`
	Score       *int        `json:"score"`
	Comment     string      `json:"comment"`
	SubmittedAt time.Time   `json:"submitted_at"`
}
type FindAllStudentRes struct {
	List     []CommitItem `json:"list"`
	Total    uint64       `json:"total"`
	Page     uint64       `json:"page"`
	PageSize uint64       `json:"page_size"`
}
