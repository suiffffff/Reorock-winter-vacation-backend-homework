package dao

import (
	"errors"
	"system/dto"
	"system/models"
	"system/pkg"
	"time"

	"gorm.io/gorm"
)

// 作业附加接口
func FindSubmissionCount(homeworkID uint64) (int64, error) {
	var count int64
	err := DB.Model(&models.Submission{}).
		Where("homework_id = ?", homeworkID).
		Count(&count).Error
	return count, err
}
func FindMySubmission(homeworkID, userID uint64) (*dto.MySubmissionInfo, error) {
	var result dto.MySubmissionInfo
	err := DB.Model(&models.Submission{}).
		Where("homework_id = ? AND student_id = ?", homeworkID, userID).
		Select("id, score, is_excellent").
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	if result.ID == 0 {
		return nil, nil
	}

	return &result, nil
}

// 提交接口
func SubmitHomework(submission *models.Submission) error {
	var existing models.Submission
	err := DB.Where("homework_id = ? AND student_id = ?", submission.HomeworkID, submission.StudentID).
		First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		if submission.SubmittedAt.IsZero() {
			submission.SubmittedAt = time.Now()
		}
		return DB.Create(submission).Error
	}

	if err != nil {
		return err
	}

	updates := map[string]interface{}{
		"content":      submission.Content,
		"file_url":     submission.FileUrl,
		"submitted_at": time.Now(),
		"is_late":      submission.IsLate,
		"updated_at":   time.Now(),
	}
	return DB.Model(&existing).Updates(updates).Error
}
func FindSubmission(submission *models.Submission) (*dto.SubmitHomeworkRes, error) {
	var result dto.SubmitHomeworkRes
	err := DB.Where("homework_id = ? AND student_id = ?", submission.HomeworkID, submission.StudentID).
		Select("id, score, is_excellent, submitted_at, is_late"). // 关键：只查这几个字段
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}
func FindAllMySubmit(submission *models.Submission, page, pageSize int) (*dto.FindAllMySubmitRes, error) {
	var submissions []models.Submission
	var total int64
	query := DB.Model(&models.Submission{}).Where("student_id = ?", submission.StudentID)

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	err := query.Preload("Homework").
		Order("submitted_at DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&submissions).Error
	if err != nil {
		return nil, err
	}

	list := make([]dto.SubmissionItem, 0)
	for _, s := range submissions {
		list = append(list, dto.SubmissionItem{
			ID:          s.ID,
			Score:       s.Score,
			Comment:     s.Comment,
			IsExcellent: s.IsExcellent,
			SubmittedAt: s.SubmittedAt,
			Homework: dto.HomeworkMsg{
				ID:              s.Homework.ID,
				Title:           s.Homework.Title,
				Department:      s.Homework.Department,
				DepartmentLabel: pkg.GetDepartmentLabel(s.Homework.Department),
			},
		})
	}

	return &dto.FindAllMySubmitRes{
		List:     list,
		Total:    uint64(total),
		Page:     uint64(page),
		PageSize: uint64(pageSize),
	}, nil
}
func FindAllStudentSubmit(submission *models.Submission, page, pageSize int) (*dto.FindAllStudentRes, error) {
	var submissions []models.Submission
	var total int64
	query := DB.Model(&models.Submission{}).Where("student_id = ?", submission.HomeworkID)
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
	err := query.Preload("Student").
		Order("submitted_at DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&submissions).Error
	if err != nil {
		return nil, err
	}
	list := make([]dto.CommitItem, 0)
	for _, s := range submissions {
		list = append(list, dto.CommitItem{
			ID:          s.ID,
			Content:     s.Content,
			IsLate:      s.IsLate,
			Score:       s.Score,
			Comment:     s.Comment,
			SubmittedAt: s.SubmittedAt,
			Student: dto.StudentItem{
				ID:              s.Student.ID,
				NickName:        s.Student.Nickname,
				Department:      s.Student.Department,
				DepartmentLabel: pkg.GetDepartmentLabel(s.Student.Department),
			},
		})
	}
	return &dto.FindAllStudentRes{
		List:     list,
		Total:    uint64(total),
		Page:     uint64(page),
		PageSize: uint64(pageSize),
	}, nil
}
