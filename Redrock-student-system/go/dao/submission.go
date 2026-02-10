package dao

import "system/models"

// 略微思索，这里好像能复用啊？只需要把不同的接口在handler鉴权就行
func FindSubmissionCount(submission *models.Submission) error {
	return DB.Where("homework_id=?", submission.HomeworkID).Error
}
