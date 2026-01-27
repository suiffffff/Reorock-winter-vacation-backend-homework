// 基础 URL
const BASE_URL = 'https://dd0e0bdc-b7fc-42f3-bc87-810ef0bd3eb3.mock.pstmn.io';


/**
 * 封装的 fetch 请求函数
 * @param {string} url - 接口路径 (如 '/api/user')
 * @param {object} options - fetch 配置项
 */
async function request(endpoint, options = {}) {
  // 1. 组装完整的 URL
  const url = endpoint.startsWith('http') ? endpoint : BASE_URL + endpoint;

  // 2. 默认请求头配置
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 3. 如果本地有 access_token，自动注入 Authorization 头
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 4. 发起初次请求
  let response = await fetch(url, { ...options, headers });

  // 5. 核心逻辑：拦截 401 过期错误
  if (response.status === 401) {
    console.log('Token 可能过期，尝试刷新...');

    // 尝试刷新 token
    const refreshSuccess = await refreshToken();

    if (refreshSuccess) {
      console.log('Token 刷新成功，重试原请求');
      // 刷新成功，读取最新的 token
      const newToken = localStorage.getItem('access_token');
      headers['Authorization'] = `Bearer ${newToken}`;

      // 使用新 token 重试原来的请求
      response = await fetch(url, { ...options, headers });
    } else {
      console.log('Token 刷新失败，请重新登录');
      // 刷新失败（refresh_token 也过期了），清除数据并跳转登录
      logout();
      // 这里可以抛出一个错误中断后续逻辑
      throw new Error('Session expired');
    }
  }

  return response;
}

// 防止并发刷新（如果有多个请求同时 401，只刷新一次）
let isRefreshing = false;

/**
 * 刷新 Token 的具体逻辑
 */
async function refreshToken() {
  if (isRefreshing) return false; // 如果正在刷新，不要重复调用（简单锁）
  isRefreshing = true;

  try {
    const refreshTokenStr = localStorage.getItem('refresh_token');
    if (!refreshTokenStr) return false;

    // 发送刷新请求 (假设刷新接口是 /refresh，请根据实际 API 修改)
    const response = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenStr })
    });

    if (response.ok) {
      const result = await response.json();
      // 假设后端返回 code === 0 代表成功
      if (result.code === 0) {
        // 保存新的 access_token 和 refresh_token
        // 注意：根据你实际的接口返回修改字段名
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('刷新 Token 出错:', error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * 退出登录辅助函数
 */
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  switchPage('page-login');
  // 可以弹窗提示
  alert('登录已过期，请重新登录');
}


function switchPage(targetPageId) {
  //隐藏所有页面
  const allPages = document.querySelectorAll('.page-container');
  allPages.forEach(page => {
    page.classList.add('hidden');
  });
  //切换指定页面
  const targetPage = document.getElementById(targetPageId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  } else {
    console.error('找不到页面:', targetPageId);
  }
}

switchPage('page-login')

// 登录页面事件设置
function setupLogin() {
  switchPage('page-login')
  document.querySelector('.login-btn').addEventListener('click', async () => {
    const loginForm = document.querySelector('.login-form')
    const loginObj = serialize(loginForm, { hash: true, empty: true })

    try {
      const response = await request('/user/login', {
        method: 'POST',
        body: JSON.stringify(loginObj)
      })

      if (!response.ok) {
        throw new Error('网络请求错误，状态码：' + response.status)
      }

      const result = await response.json()

      if (result.code === 0) {
        console.log('登录成功', result)
        // 执行跳转或保存 Token
        localStorage.setItem('access_token', result.data.access_token)
        localStorage.setItem('refresh_token', result.data.refresh_token)

        try {
          const response = await request('/user/profile', {
            method: 'GET',
          })

          if (!response.ok) {
            throw new Error('网络请求错误，状态码：' + response.status)
          }

          const result = await response.json()
          if (result.code === 0) {
            console.log('获取信息成功', result)
            document.querySelector('.username').innerHTML = result.data.nickname
            document.querySelector('.avatar').innerHTML = result.data.nickname.charAt(0)
            document.querySelector('.department').innerHTML = result.data.department_label

          }
        } catch (error) {
          console.error('Catch Error:', error)
        }
        switchPage('page-system')
      } else {
        // 业务逻辑错误 (如密码不对)
        const toastDom = document.querySelector('.login-toast')
        if (toastDom) {
          const toast = new bootstrap.Toast(toastDom)
          toast.show()
        }
        // 这里可以直接打印后端返回的错误信息
        console.log(result)
        console.error('登录失败:', result.msg || '未知错误');
      }

    } catch (error) {
      // 捕获所有错误 (网络错误或解析错误)
      console.error('Catch Error:', error)
      const toastDom = document.querySelector('.login-toast')
      if (toastDom) {
        const toast = new bootstrap.Toast(toastDom)
        toast.show();
      }
    }
  })
  document.querySelector('.login-register-btn').addEventListener('click', () => {
    switchPage('page-register')
  })
}

// 注册页面事件设置
function setupRegister() {
  document.querySelector('.register-btn').addEventListener('click', async () => {
    const registerForm = document.querySelector('.register-form')
    const registerObj = serialize(registerForm, { hash: true, empty: true })

    try {
      console.log(registerObj)
      const { username, password, nickname, department } = registerObj

      if (!username || username.length < 8) {
        alert('账号长度必须大于8位')
        return
      }

      if (!password || password.length < 6) {
        alert('密码长度必须大于6位')
        return
      }

      if (!nickname || nickname.trim() === '') {
        alert('昵称不能为空')
        return
      }

      if (!department || department === '') {
        alert('请选择部门')
        return
      }

      // 检查账号是否重名
      try {
        const checkResponse = await request('/user/check-username', {
          method: 'POST',
          body: JSON.stringify({ username })
        })

        if (!checkResponse.ok) {
          throw new Error('检查账号失败')
        }

        const checkResult = await checkResponse.json()
        console.log(checkResult.code)
        if (checkResult.code === 0) {
          // 账号已存在
          const toastDom = document.querySelector('.register-toast')
          if (toastDom) {
            // 修改提示信息
            const infoBox = toastDom.querySelector('.info-box')
            if (infoBox) {
              infoBox.textContent = '账号已存在'
            }
            const toast = new bootstrap.Toast(toastDom)
            toast.show()
          }
          return
        }

        // 账号不重名，发送注册请求
        console.log('账号可用，准备发送注册请求:', registerObj)

        const registerResponse = await request('/user/register', {
          method: 'POST',
          body: JSON.stringify(registerObj)
        })

        if (!registerResponse.ok) {
          throw new Error('注册请求失败，状态码：' + registerResponse.status)
        }

        const registerResult = await registerResponse.json()

        if (registerResult.code === 0) {
          console.log('注册成功:', registerResult)
          // 注册成功后可以跳转到登录页面
          alert('注册成功，请登录')
          switchPage('page-login')
        } else {
          console.log('注册失败:', registerResult)
          const toastDom = document.querySelector('.register-toast')
          if (toastDom) {
            const infoBox = toastDom.querySelector('.info-box')
            if (infoBox) {
              infoBox.textContent = registerResult.msg || '注册失败'
            }
            const toast = new bootstrap.Toast(toastDom)
            toast.show()
          }
        }

      } catch (checkError) {
        console.error('检查账号或注册时出错:', checkError)
        // 提示用户注册失败
        const toastDom = document.querySelector('.register-toast')
        if (toastDom) {
          const infoBox = toastDom.querySelector('.info-box')
          if (infoBox) {
            infoBox.textContent = '注册时出错，请稍后再试'
          }
          const toast = new bootstrap.Toast(toastDom)
          toast.show()
        }
      }

    }
    catch (error) {
      console.error('注册时出错:', error)
    }

  })
  document.querySelector('.comeback-btn').addEventListener('click', () => {
    switchPage('page-login')
  })
}


function setupSystem() {

  document.querySelector('.dropdown-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdownMenu = document.getElementById('userDropdown')
    dropdownMenu.classList.toggle('show');
  });

  // 点击其他区域关闭下拉菜单
  document.addEventListener('click', () => {
    const dropdownMenu = document.getElementById('userDropdown')
    if (dropdownMenu) {
      dropdownMenu.classList.remove('show')
    }
  });

  document.querySelector('.system-exit').addEventListener('click', () => {
    console.log('退出登录')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    switchPage('page-login')
  })

  document.querySelector('.system-delete').addEventListener('click', () => {
    // console.log(11)
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))
    deleteModal.show()
  })

  // 确认注销按钮
  document.querySelector('.delete-confirm-btn').addEventListener('click', async () => {
    // console.log('确认注销账户');

    // 获取密码输入
    const passwordInput = document.getElementById('delete-password');
    const password = passwordInput.value.trim();

    if (!password) {
      alert('请输入密码');
      return;
    }

    try {
      const response = await request('/user/account', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error('注销请求失败');
      }

      const result = await response.json();

      if (result.code === 0) {
        console.log('注销成功:', result);
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        deleteModal.hide();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        switchPage('page-login');
      } else {
        console.log('注销失败:', result);
        alert(result.msg || '注销失败');
      }

    } catch (error) {
      console.error('注销时出错:', error);
      alert('注销时出错，请稍后再试');
    }
  })
}
// 页面加载时初始化所有事件监听器
function initApp() {
  setupLogin()
  setupRegister()
  setupSystem()
}

// 初始化应用
initApp()
