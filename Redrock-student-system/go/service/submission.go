package service

import (
	"system/dao"
	"system/dto"
	"system/models"
)

// 作业附加接口
func FindSubmissionCount(homeworkID uint64) (int64, error) {
	return dao.FindSubmissionCount(homeworkID)
}
func FindMySubmission(homeworkID, userID uint64) (*dto.MySubmissionInfo, error) {
	return dao.FindMySubmission(homeworkID, userID)
}

// 提交接口
func SubmitHomework(req *dto.SubmitHomeworkReq, studentID uint64) (*dto.SubmitHomeworkRes, error) {
	submissionmodel := models.Submission{
		StudentID:  studentID,
		HomeworkID: req.HomeworkID,
		Content:    req.Content,
		FileUrl:    req.FileUrl,
	}
	err := dao.SubmitHomework(&submissionmodel)
	if err != nil {
		return nil, err
	}
	return dao.FindSubmission(&submissionmodel)
}
func FindAllMySubmit(studentID uint64, page, pageSize int) (*dto.FindAllMySubmitRes, error) {
	submissionmodel := models.Submission{
		StudentID: studentID,
	}
	return dao.FindAllMySubmit(&submissionmodel, page, pageSize)
}
func FindAllStudentSubmit(HomeworkID uint64, page, pageSize int) (*dto.FindAllStudentRes, error) {
	submissionmodel := models.Submission{
		HomeworkID: HomeworkID,
	}
	return dao.FindAllStudentSubmit(&submissionmodel, page, pageSize)
}
