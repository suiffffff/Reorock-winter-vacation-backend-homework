package pkg

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

//是时候拿出我以前写（抄）的jwt了

var (
	accessSecret  = []byte("zhang_da_wo_yao_dang_xue_jie")
	refreshSecret = []byte("xue_jie_gei_wo_ai_he_de_nai_cha")
	issuer        = "demo.jwt.singlefile"
	accessTTL     = 15 * time.Minute
	refreshTTL    = 7 * 24 * time.Hour
)

// 根据浅显的认知，标准md5的加密没Secret，那么密码不就相当于可以被破解的吗？
func Jiami(Password string) string {
	h := md5.New()
	h.Write([]byte(Password))
	return hex.EncodeToString(h.Sum(nil))
}

type CustomClaims struct {
	//用户ID，简称UID，原神...
	UserID uint `json:"uid"`
	//用户角色，可以精确的推送小广告？
	Role string `json:"role"`
	//记录访问令牌还是刷新令牌
	//这里记录一下个人理解
	//访问令牌是一种记录实际需要的，会造成个人资产变动的东西，就像一个金库的入口密码一样，每次请求都会向服务器发送一串信息，来确定你的访问是正常的，合法的，是正常访问服务器的
	//刷新令牌则是一种记录个人信息的。来证明你是你的，服务器知道是你才会给你发访问令牌，所以这个是需要更安全的加密
	Type string `json:"type"`
	//这里是匿名嵌入，因为用户的数据不可能是一成不变的，所以需要手动输入，匿名嵌入后可以在使用时设置变量
	jwt.RegisteredClaims
}

func GenerateTokens(userID uint, role string) (accessToken string, refreshToken string, err error) {
	now := time.Now()
	accessClaims := CustomClaims{
		UserID: userID,
		Role:   role,
		//这里是通行令牌
		Type: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			//签发者，验证身份，不对会报错
			Issuer: issuer,
			//这里把数字ID转换成了字符（符合标准顺便防止程序某些判断？）
			Subject: fmt.Sprintf("%d", userID),
			//发给谁用的
			Audience: []string{"user"},
			//过期时间，15分钟
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
			//解决服务器误差，服务器的时间好像可能会比验证服务器快点？所以做不到发了就能立刻使用（生成的生效时间是12.01，但验证服务器是12.00？）
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			//记录签发时间
			IssuedAt: jwt.NewNumericDate(now),
		},
	}
	//newwidthclaims创建了一个Token的结构体，第一个参数为加密方式（可以注意一下，后面会用），第二个参数是我们刚刚填的表，就像是把内容经过一道加密步骤
	accessTok := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	//这里会生成一串字符用来保存信息，Header：（alg）和加密算法有关（typ默认jwt）Claim（刚刚填的表格），然后加入accessSecret
	//这里的accessSecret非常关键，任何一个字符的加入对于哈希函数的转换都是完全不同的，如果没有accessSecret，那么只需要知道结构，就能伪造出一模一样的管理员权限
	//需要注意的是，header和claims并没有加密，只是转换成Base64编码，所以是能被翻译回来的
	//但是，转换成Base64码后，又会和后面的secret拼接
	//所以，之前的可以理解为公开密码，accessSecret可以理解为一种自己知道的密码，加入后就不能轻易知道整个密码。
	//同样需要注意的是，accessSecret虽然被加入，但并不会被破解，因为哈希函数的运输发生了信息丢失，例如（2（claim）+9（secret））%10=1，这里的secret可以是9，19，29...
	//前面的数据改了一点，base码就会不同，之后的哈希函数加密也会完全不同
	//然后最后的密码会被转换成Base64码给accessToken
	//Base64码是一种便于http传输的格式，主要作用是将复杂的语言翻译为计算机能够识别的语言
	accessToken, err = accessTok.SignedString(accessSecret)
	if err != nil {
		//%w保留原始错误结构
		return "", "", fmt.Errorf("sign access token:%w", err)
	}
	//这里和上述函数一样，唯一的区别是换了refreshSecret，也就是其他的加密
	refreshClaims := CustomClaims{
		UserID: userID,
		//识别身份
		Role: role,
		Type: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   fmt.Sprintf("%d", userID),
			Audience:  []string{"user"},
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshTTL)),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshTok := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refreshTok.SignedString(refreshSecret)
	if err != nil {
		return "", "", fmt.Errorf("sign refresh token: %w", err)
	}
	return accessToken, refreshToken, nil
}

// 去掉带Bearer的前缀
// Bearer是一种认证方式，前端为了规范发送请求时会在Token前面加上Bearer
// 这种方式嘛，就是不管你人，只要你的token是对的，就能登录
func stripBearer(s string) string {
	// strings.TrimSpace(s): 先把两头的空格去掉，防止 " Bearer ..." 这种情况
	// strings.ToLower(...): 把字符串全变小写。这样无论前端传的是 "Bearer", "bearer", 还是 "BEARER"，都能识别。
	// strings.HasPrefix(..., "bearer"): 检查处理后的字符串是不是以 "bearer" 开头。
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(s)), "bearer") {
		//s[len("Bearer"):]: 这是一个切片操作。
		//len("Bearer") 是 6。意思是：从第 6 个字符开始截取，一直到最后。
		//也就是把前面 "Bearer" 这 6 个字母切掉。
		//外面再包一层 TrimSpace，是为了把 "Bearer" 和 "Token" 中间那个空格切掉。
		return strings.TrimSpace(s[len("Bearer"):])
	}
	return strings.TrimSpace(s)
}

// VerifyAccessToken
// verify:验证 AccessToken:通行令牌
// 前端会传入tokenstr(顺便带一个Bearer）
func VerifyAccessToken(tokenstr string) (*CustomClaims, error) {
	raw := stripBearer(tokenstr)
	//这个函数有以下功能：解码Base64，还原json到结构体，验证签名
	//如果之前理解了，因为header和claim是没有加密的，所以能被一一对应回结构体
	//最后的签名则是被加密，需要验伪
	token, err := jwt.ParseWithClaims(raw, &CustomClaims{}, func(t *jwt.Token) (interface{}, error) {
		//t.Method.(*jwt.SigningMethodHMAC)检查 Token 头部声明的算法是不是 HMAC 系列，如果黑客改成None（不加密方式）可能会被直接通过
		//t.Method.Alg() != jwt.SigningMethodHS256.Alg()必须是HS256
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method:%v", t.Header["alg"])
		}
		//如果确认了你的加密类型和格式是对的，再传密码（之后）服务器验证
		return accessSecret, nil
	}, jwt.WithLeeway(5*time.Second)) //允许服务器误差
	if err != nil {
		return nil, err
	}
	//之前同样说过header和claims，前端返回很长的字符串，被函数解码后储存到CustomClaims{}里面，这里的token.Claims就是这张表然后强制类型转换为CustomerClaims方便后续判断
	claims, ok := token.Claims.(*CustomClaims)
	//这里的valid是验签名的（拿出secret和header和claims重新算一次哈希，同时验证时间
	//secret哪里来的？答案是之前返回的secret给了token，能自动调用
	if !ok || !token.Valid {
		return nil, errors.New("invalid access token")
	}
	//这里是区分访问令牌和刷新令牌
	if claims.Type != "access" {
		return nil, errors.New("token type mismatch:not an access token")
	}
	return claims, nil
}

// 同样的操作再来一遍
func VerifyRefreshToken(tokenStr string) (*CustomClaims, error) {
	raw := stripBearer(tokenStr)
	token, err := jwt.ParseWithClaims(raw, &CustomClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() !=
			jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v",
				t.Header["alg"])
		}
		return refreshSecret, nil
	}, jwt.WithLeeway(5*time.Second))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}
	if claims.Type != "refresh" {
		return nil, errors.New("token type mismatch: not a refresh token")
	}
	return claims, nil
}
