package dto

// 作业接口
type FindSubmissionReq struct {
	HomeworkID uint64 `json:"homework_id"`
}

// 提交接口
type SubmitHomeworkReq struct {
	HomeworkID uint64 `json:"homework_id" binding:"required"`
	Content    string `json:"content" binding:"required"`
	FileUrl    string `json:"file_url"`
}
