package router

import (
	"system/handler"
	"system/middleware"

	"github.com/gin-gonic/gin"
)

func SetUpRouter() *gin.Engine {
	r := gin.Default()
	public := r.Group("/user")
	{
		public.GET("/check", handler.FindUserName)
		public.POST("/register", handler.AddUser)
		public.POST("/login", handler.Login)
		public.POST("/refresh", handler.RefreshToken)
	}
	userGroup := r.Group("/user", middleware.JWTAuthMiddleware())
	{
		userGroup.GET("/profile", handler.GetProfile)
		userGroup.DELETE("/account", handler.DeleteAccount)
	}
	homeworkGroup := r.Group("/homework", middleware.JWTAuthMiddleware())
	{
		homeworkGroup.POST("", handler.AddHomework)
		homeworkGroup.GET("", handler.FindHomework)
		homeworkGroup.GET("/:id", handler.FindHomeworkByID)
		homeworkGroup.PUT("/:id", handler.UpdateHomework)
		homeworkGroup.DELETE("/:id", handler.DeleteHomework)
	}
	submissionGroup := r.Group("/submission", middleware.JWTAuthMiddleware())
	{
		submissionGroup.POST("", handler.SubmitHomework)
		submissionGroup.GET("/my", handler.FindAllMySubmit)
		submissionGroup.GET("/homework/:homework_id", handler.FindAllStudentSubmit)
	}
	return r
}
