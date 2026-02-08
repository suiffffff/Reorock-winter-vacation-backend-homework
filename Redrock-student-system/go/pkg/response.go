package pkg

import (
	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

const (
	CodeSuccess = 0
	//错误类型
	CodeParamError = 10001
	CodeAuthError  = 10002

	CodeSystemError = 50000
)

func Success(c *gin.Context, msg string, data interface{}) {
	c.JSON(200, Response{
		Code:    CodeSuccess,
		Message: msg,
		Data:    data,
	})
}
func Error(c *gin.Context, code int, msg string) {
	c.JSON(200, Response{
		Code:    code,
		Message: msg,
		Data:    nil,
	})
}
func ErrorWithStatus(c *gin.Context, httpStatus int, code int, msg string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: msg,
		Data:    nil,
	})
}
