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

  // 导航栏切换
  // 分页功能
  const homeworkPagination = {
    //this是homeworkPagination，因为是在外面homeworkPagination.init()调用了方法
    currentPage: 1,
    //占位符，之后会被修改,一页显示多少
    itemsPerPage: 3,
    //有多少页
    totalPages: 2,
    //存储数据
    allHomeworkCards: [],

    //加了个异步，发现服务器返回数据需要一会，这段时间渲染会出问题，干脆先返回数据再渲染界面
    async init() {
      // 禁用所有功能按钮，防止在获取数据过程中点击
      const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
      allButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
      });

      try {
        const grid = document.getElementById('homeworkGrid');
        if (!grid) return;

        //转节点列表转数组
        this.allHomeworkCards = Array.from(grid.querySelectorAll('.homework-card'));
        //计算每页显示多少卡片
        this.calculateItemsPerPage();
        //计算页数
        await this.updateTotalPages();
        //绑定点击事件
        this.bindEvents();
        //初始渲染，强制显示第一页
        this.renderPage(1);
        //响应式处理，监听点击以及窗口变化
        this.bindResizeEvent();
      } finally {
        // 重新启用所有功能按钮
        const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
        allButtons.forEach(button => {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = '';
        });
      }
    },

    calculateItemsPerPage() {
      const grid = document.getElementById('homeworkGrid');
      if (!grid) return;

      //拿出grid的所有css样式
      const computedStyle = window.getComputedStyle(grid);
      //找到columns，就是有几列
      const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');
      //算出当前一行有几列
      const columnCount = gridTemplateColumns.split(' ').length;
      //一共三行
      this.itemsPerPage = columnCount * 3;
    },

    async updateTotalPages() {
      try {
        const response = await request('/homework', {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();

          console.log(result)

          if (result.code === 0 && result.data) {
            // 处理作业列表数据，如果存在则调用渲染函数渲染后端传来的作业
            if (result.data.list && Array.isArray(result.data.list)) {
              this.renderHomeworkList(result.data.list);
            }

            // 计算总页数
            if (result.data.total !== undefined) {
              const totalItems = result.data.total;
              this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
            } else if (result.data.list) {
              this.totalPages = Math.ceil(result.data.list.length / this.itemsPerPage);
            }
            return;
          }
        }
      } catch (error) {
        console.log('获取作业数据失败，使用默认计算');
      }

      this.totalPages = Math.ceil(this.allHomeworkCards.length / this.itemsPerPage);
      if (this.totalPages < 1) {
        this.totalPages = 1;
      }
    },

    renderHomeworkList(homeworkList) {
      const grid = document.getElementById('homeworkGrid');
      if (!grid) return;

      // 清空现有卡片
      grid.innerHTML = '';
      this.allHomeworkCards = [];

      // 渲染新卡片
      homeworkList.forEach(homework => {
        //这里result.data.list=homeworklist=homework
        const card = this.createHomeworkCard(homework);
        grid.appendChild(card);
        this.allHomeworkCards.push(card);
      });

      // 重新计算每页显示数量
      this.calculateItemsPerPage();

      // 禁用所有新创建的功能按钮，确保在init()完成前保持禁用状态
      const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
      allButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
      });
    },

    createHomeworkCard(homework) {
      const card = document.createElement('div');
      card.className = 'homework-card';
      card.dataset.homeworkId = homework.id;

      // 处理标题和描述
      const displayTitle = homework.title || '未命名作业';
      const displayDesc = homework.description || '无描述';
      const displayDept = homework.department_label || homework.department || '未知部门';
      const now = new Date();
      const deadlineDate = homework.deadline ? new Date(homework.deadline) : null;
      const isOverdue = deadlineDate && deadlineDate < now;
      const overdueClass = isOverdue ? ' overdue' : '';
      const displayDeadline = deadlineDate ? this.formatDate(homework.deadline) : '未设置';

      card.innerHTML = `
      <div class="homework-card-header">
        <h5>${displayTitle}</h5>
        <span class="deadline${overdueClass}">截止: ${displayDeadline}</span>
      </div>
      <div class="homework-card-body">
        <p>${displayDesc}</p>
        <div class="homework-card-footer">
          <span class="department-tag">${displayDept}</span>
          
          <div class="view-dropdown">
            <button class="view-btn" data-homework-id="${homework.id}">查看</button>
            <div class="view-dropdown-menu">
               <button class="dropdown-item view-homework" data-homework-id="${homework.id}">查看作业</button>
              <button class="dropdown-item edit-homework" data-homework-id="${homework.id}">修改作业</button>
              <button class="dropdown-item delete-homework" data-homework-id="${homework.id}">删除作业</button>
            </div>
          </div>
        </div>
      </div>
      <div class="homework-id hidden">${homework.id}</div>
    `;

      // 事件委托已经在setupHomeworkCardEvents中处理，不需要为每个卡片单独添加事件监听器
      //看代码->卧槽怎么这破ai穷举啊->ai修改一下事件监听，改为事件委托->ai生成代码->看代码
      return card;
    },

    async viewHomeworkDetail(homeworkId) {
      try {
        // 禁用所有功能按钮，防止重复请求
        const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
        allButtons.forEach(button => {
          button.disabled = true;
          button.style.opacity = '0.6';
          button.style.cursor = 'not-allowed';
        });

        // 找到对应的作业卡片
        const card = document.querySelector(`[data-homework-id="${homeworkId}"]`);
        if (!card) return;

        // 保存卡片的原始状态
        card.dataset.originalState = 'collapsed';
        card.dataset.originalClass = card.className;
        card.style.transition = 'all 0.3s ease';

        // 显示加载状态
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'card-loading';
        loadingMessage.textContent = '加载中...';
        card.appendChild(loadingMessage);

        // 发送GET请求获取作业详情
        const response = await request(`/homework/${homeworkId}`, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error('获取作业详情失败，状态码：' + response.status);
        }

        const result = await response.json();

        if (result.code === 0 && result.data) {
          // 移除加载状态
          if (loadingMessage) {
            loadingMessage.remove();
          }

          // 扩大卡片
          this.expandCard(card, result.data);
        } else {
          throw new Error('获取作业详情失败：' + (result.msg || '未知错误'));
        }

      } catch (error) {
        console.error('查看作业失败:', error);
        alert('查看作业失败：' + error.message);

        // 移除加载状态
        const loadingMessage = document.querySelector('.card-loading');
        if (loadingMessage) {
          loadingMessage.remove();
        }

        // 重新启用所有功能按钮
        const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
        allButtons.forEach(button => {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = '';
        });
      }
    },

    expandCard(card, homework) {
      const grid = document.getElementById('homeworkGrid');
      if (!grid || !card) return;

      // 隐藏其他卡片
      const otherCards = grid.querySelectorAll('.homework-card:not([data-homework-id="' + homework.id + '"])');
      otherCards.forEach(otherCard => {
        otherCard.style.display = 'none';
      });

      // 禁用分页控件
      this.disablePagination();

      // 扩大当前卡片
      card.style.minHeight = '600px';
      card.className = 'homework-card homework-card-expanded';
      card.dataset.originalState = 'expanded';

      // 保存原始内容
      const originalContent = card.innerHTML;
      card.dataset.originalContent = originalContent;

      const deadline = homework.deadline ? new Date(homework.deadline) : new Date();
      const now = new Date();
      const isOverdue = deadline < now;

      // 更新卡片内容为详情
      card.innerHTML = `
        <div class="homework-detail-header">
          <div class="homework-detail-actions">
            <button class="homework-back-btn" data-homework-id="${homework.id}">返回</button>
            <h3>${homework.title || '未命名作业'}</h3>
            <button class="homework-grade-btn" data-homework-id="${homework.id}">批改作业</button>
          </div>
          <div class="homework-detail-meta">
            <span class="homework-detail-deadline${isOverdue ? ' overdue' : ''}">截止: ${homework.deadline ? this.formatDateTime(homework.deadline) : '未设置'}</span>
            <span class="homework-detail-department">${homework.department_label || homework.department || '未知部门'}</span>
          </div>
        </div>
        <div class="homework-detail-content">
          <h4>作业描述</h4>
          <p>${homework.description || '无描述'}</p>
          <h4>创建者</h4>
          <p>${homework.creator ? homework.creator.nickname : '未知'}</p>
          <h4>提交情况</h4>
          <p>已提交: ${homework.submission_count || 0} 人</p>
        </div>
        <div class="homework-submission-section">
          <h4>提交作业</h4>
          <div class="submission-form">
            <div class="form-group">
              <label for="submission-text-${homework.id}">作业内容</label>
              <textarea id="submission-text-${homework.id}" class="form-control" rows="4" placeholder="请输入作业内容..."></textarea>
            </div>
            <button class="submission-btn" data-homework-id="${homework.id}">提交作业</button>
          </div>
        </div>
        <div class="homework-id hidden">${homework.id}</div>
      `;

      // 添加返回按钮点击事件
      const backBtn = card.querySelector('.homework-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.collapseCard(card);
        });
      }

      // 添加批改按钮点击事件
      const gradeBtn = card.querySelector('.homework-grade-btn');
      if (gradeBtn) {
        gradeBtn.addEventListener('click', () => {
          alert('批改作业功能开发中...');
        });
      }

      // 添加修改按钮点击事件
      const editBtn = card.querySelector('.homework-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          // 填充修改作业模态框数据
          this.fillEditHomeworkModal(homework);
          // 显示修改作业模态框
          const editModal = new bootstrap.Modal(document.getElementById('editHomeworkModal'));
          editModal.show();
        });
      }

      // 添加删除按钮点击事件
      const deleteBtn = card.querySelector('.homework-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          // 存储当前要删除的作业ID
          window.currentDeleteHomeworkId = homework.id;
          // 显示删除确认模态框
          const deleteModal = new bootstrap.Modal(document.getElementById('deleteHomeworkModal'));
          deleteModal.show();
        });
      }

      // 添加确认删除按钮点击事件
      const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
      if (confirmDeleteBtn) {
        // 移除之前的事件监听器，避免重复绑定
        confirmDeleteBtn.removeEventListener('click', handleConfirmDelete);
        // 添加新的事件监听器
        confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
      }

      // 确认删除处理函数
      async function handleConfirmDelete() {
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (!confirmDeleteBtn) return;

        // 禁用删除按钮，防止重复点击
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.style.opacity = '0.6';
        confirmDeleteBtn.style.cursor = 'not-allowed';

        const homeworkId = window.currentDeleteHomeworkId;
        if (homeworkId) {
          // 关闭模态框
          const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteHomeworkModal'));
          if (deleteModal) {
            deleteModal.hide();
          }
          // 执行删除操作
          try {
            const response = await request(`/homework/${homeworkId}`, {
              method: "DELETE"
            });

            if (!response.ok) {
              throw new Error('删除作业失败，状态码：' + response.status);
            }

            const result = await response.json();

            if (result.code === 0) {
              // 删除成功
              console.log('删除作业成功:', result);
              alert('作业删除成功！');

              // 重新渲染作业列表
              homeworkPagination.init();
            } else {
              // 业务逻辑错误
              console.log('删除作业失败:', result);
              alert(result.message || '删除作业失败');
            }
          } catch (error) {
            // 网络错误或其他错误
            console.error('删除作业时出错:', error);
            alert('删除作业时出错，请稍后再试');
          } finally {
            // 清除存储的作业ID
            window.currentDeleteHomeworkId = null;
            // 重新启用删除按钮
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.style.opacity = '1';
            confirmDeleteBtn.style.cursor = '';
          }
        } else {
          // 没有作业ID，重新启用按钮
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.style.opacity = '1';
          confirmDeleteBtn.style.cursor = '';
        }
      }

      // 添加提交按钮点击事件
      const submissionBtn = card.querySelector('.submission-btn');
      if (submissionBtn) {
        submissionBtn.addEventListener('click', () => {
          this.submitHomework(homework.id);
        });
      }
    },

    collapseCard(card) {
      if (!card) return;

      // 恢复其他卡片的显示
      const grid = document.getElementById('homeworkGrid');
      if (grid) {
        const otherCards = grid.querySelectorAll('.homework-card');
        otherCards.forEach(otherCard => {
          otherCard.style.display = '';
        });
      }

      // 恢复卡片的原始状态
      card.style.transition = 'all 0.3s ease';
      card.className = card.dataset.originalClass || 'homework-card';
      card.style.minHeight = '';

      // 恢复原始内容
      if (card.dataset.originalContent) {
        card.innerHTML = card.dataset.originalContent;
      }

      // 重新绑定查看按钮事件
      const viewBtn = card.querySelector('.view-btn');
      const viewDropdown = card.querySelector('.view-dropdown');
      if (viewBtn && viewDropdown) {
        const homeworkId = card.dataset.homeworkId;
        viewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // 关闭所有其他打开的下拉菜单
          document.querySelectorAll('.view-dropdown').forEach(dropdown => {
            if (dropdown !== viewDropdown) {
              dropdown.classList.remove('active');
            }
          });
          // 切换当前下拉菜单显示/隐藏
          viewDropdown.classList.toggle('active');
        });

        // 重新绑定查看作业菜单项点击事件
        const viewHomeworkBtn = card.querySelector('.view-homework');
        if (viewHomeworkBtn) {
          viewHomeworkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 关闭下拉菜单
            viewDropdown.classList.remove('active');
            // 显示作业详情
            this.viewHomeworkDetail(homeworkId);
          });
        }

        // 重新绑定修改作业菜单项点击事件
        const editHomeworkBtn = card.querySelector('.edit-homework');
        if (editHomeworkBtn) {
          editHomeworkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 关闭下拉菜单
            viewDropdown.classList.remove('active');
            // 填充修改作业模态框数据
            // 注意：这里需要获取作业数据，简化处理直接显示模态框
            const editModal = new bootstrap.Modal(document.getElementById('editHomeworkModal'));
            editModal.show();
          });
        }

        // 重新绑定删除作业菜单项点击事件
        const deleteHomeworkBtn = card.querySelector('.delete-homework');
        if (deleteHomeworkBtn) {
          deleteHomeworkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 关闭下拉菜单
            viewDropdown.classList.remove('active');
            // 存储当前要删除的作业ID
            window.currentDeleteHomeworkId = homeworkId;
            // 显示删除确认模态框
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteHomeworkModal'));
            deleteModal.show();
          });
        }
      }

      // 清除保存的状态
      delete card.dataset.originalState;
      delete card.dataset.originalClass;
      delete card.dataset.originalContent;
      card.style.transition = '';

      // 重新渲染当前页面，确保所有卡片正确显示
      this.renderPage(this.currentPage);

      // 重新启用分页控件
      this.enablePagination();

      // 重新启用所有功能按钮
      const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
      allButtons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = '';
      });
    },

    // 禁用分页控件
    disablePagination() {
      const pagination = document.getElementById('homeworkPagination');
      if (pagination) {
        pagination.style.pointerEvents = 'none';
        pagination.style.opacity = '0.5';
      }
    },

    // 启用分页控件
    enablePagination() {
      const pagination = document.getElementById('homeworkPagination');
      if (pagination) {
        pagination.style.pointerEvents = '';
        pagination.style.opacity = '';
      }
    },

    // 填充修改作业模态框数据
    fillEditHomeworkModal(homework) {
      if (!homework) return;

      // 填充作业ID
      document.getElementById('edit-homework-id').value = homework.id;
      // 填充作业标题
      document.getElementById('edit-homework-title').value = homework.title || '';
      // 填充作业描述
      document.getElementById('edit-homework-description').value = homework.description || '';
      // 填充截止时间
      if (homework.deadline) {
        const deadlineInput = document.getElementById('edit-homework-deadline');
        if (deadlineInput) {
          // 将ISO日期格式转换为datetime-local格式
          const deadline = new Date(homework.deadline);
          const localDateTime = deadline.toISOString().slice(0, 16);
          deadlineInput.value = localDateTime;
        }
      }
      // 填充允许补交
      const allowLateInput = document.getElementById('edit-homework-allow-late');
      if (allowLateInput) {
        allowLateInput.checked = homework.allow_late || false;
      }
    },

    bindCardEvents() {
      const viewBtns = document.querySelectorAll('.view-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const homeworkId = btn.dataset.homeworkId;
          if (homeworkId) {
            this.viewHomeworkDetail(homeworkId);
          }
        });
      });
    },

    async submitHomework(homeworkId) {
      const submissionText = document.getElementById(`submission-text-${homeworkId}`).value;
      const submissionFile = document.getElementById(`submission-file-${homeworkId}`).files[0];

      try {
        // 这里可以实现文件上传和作业提交逻辑
        alert('作业提交功能开发中...');
      } catch (error) {
        console.error('提交作业失败:', error);
        alert('提交作业失败：' + error.message);
      }
    },

    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    },


    //这个是服务器分发页数，这里用不到
    // setTotalPages(totalPages) {
    //   this.totalPages = totalPages;
    //   if (this.totalPages < 1) {
    //     this.totalPages = 1;
    //   }
    //   this.renderPaginationNumbers();
    // },
    bindEvents() {
      const prevBtn = document.getElementById('prevPageBtn');
      const nextBtn = document.getElementById('nextPageBtn');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (this.currentPage < this.totalPages) {
            this.renderPage(this.currentPage + 1);
          }
        });
      }
    },

    bindResizeEvent() {
      let resizeTimeout;
      //监听窗口变化
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          //如果旧的卡片与新的卡片数量一样，就不进行跳转
          const oldItemsPerPage = this.itemsPerPage;
          this.calculateItemsPerPage();

          if (oldItemsPerPage !== this.itemsPerPage) {
            //等待总页数加载完后，再渲染第一页
            this.updateTotalPages().then(() => {
              this.renderPage(1);
            });
          }
        }, 100);
      });
    },

    renderPage(page) {
      if (page < 1 || page > this.totalPages) return;

      //获取当前页码数，然后获取对应的作业卡片索引
      this.currentPage = page;
      const startIndex = (page - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      //将数组里的card和index拿出，给对应的卡片增加显示，其他卡片隐藏
      this.allHomeworkCards.forEach((card, index) => {
        if (index >= startIndex && index < endIndex) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });

      this.updatePaginationControls();
    },
    updatePaginationControls() {
      const prevBtn = document.getElementById('prevPageBtn');
      const nextBtn = document.getElementById('nextPageBtn');

      if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
      }
      if (nextBtn) {
        nextBtn.disabled = this.currentPage >= this.totalPages;
      }

      this.renderPaginationNumbers();
    },

    //这里是分页的逻辑
    renderPaginationNumbers() {
      const container = document.getElementById('paginationNumbers');
      if (!container) return;

      container.innerHTML = '';

      //小于7个
      if (this.totalPages <= 7) {
        for (let i = 1; i <= this.totalPages; i++) {
          const btn = document.createElement('button');
          //如果 i 等于当前页，加上 'active' 样式
          btn.className = `pagination-btn${i === this.currentPage ? ' active' : ''}`;
          btn.textContent = i;
          //这里点击后会进入renderPage,进入updataPaginationControls,进入renderPaginationNumbers.加入一个激活类
          btn.addEventListener('click', () => this.renderPage(i));
          container.appendChild(btn);
        }
      } else {
        const pageButtons = [];
        //当前页码位于首，推入1，2，3，4，5，...,最后页码到一个数组
        if (this.currentPage <= 4) {
          for (let i = 1; i <= 5; i++) {
            pageButtons.push(i);
          }
          pageButtons.push('...');
          pageButtons.push(this.totalPages);
        } else if (this.currentPage >= this.totalPages - 3) {
          //当前页码位于末尾，推入1，...，末尾的数字
          pageButtons.push(1);
          pageButtons.push('...');
          for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
            pageButtons.push(i);
          }
        } else {
          //当前页码离首尾均有距离，按照1,...,-2，-1，0，+1，+2,...尾
          pageButtons.push(1);
          pageButtons.push('...');
          for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) {
            pageButtons.push(i);
          }
          pageButtons.push('...');
          pageButtons.push(this.totalPages);
        }
        //排列好后开始创建元素兵器插入
        pageButtons.forEach(item => {
          if (item === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
          } else {
            const btn = document.createElement('button');
            btn.className = `pagination-btn${item === this.currentPage ? ' active' : ''}`;
            btn.textContent = item;
            btn.addEventListener('click', () => this.renderPage(item));
            container.appendChild(btn);
          }
        });
      }
      //传入的是<div class="pagination-numbers" id="paginationNumbers">这个盒子
      this.addPageJumpInput(container);
    },

    addPageJumpInput(container) {
      const jumpContainer = document.createElement('div');
      jumpContainer.className = 'pagination-jump';
      jumpContainer.innerHTML = `
        <span>跳转到</span>
        <input type="number" class="page-jump-input" min="1" max="${this.totalPages}" value="${this.currentPage}">
        <span>页</span>
        <button class="page-jump-btn">确定</button>
      `;
      container.appendChild(jumpContainer);

      const jumpInput = jumpContainer.querySelector('.page-jump-input');
      const jumpBtn = jumpContainer.querySelector('.page-jump-btn');

      if (jumpInput) {
        jumpInput.addEventListener('change', (e) => {
          let value = parseInt(e.target.value);
          if (isNaN(value)) value = 1;
          if (value < 1) value = 1;
          if (value > this.totalPages) value = this.totalPages;
          e.target.value = value;
        });

        jumpInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const page = parseInt(jumpInput.value);
            if (!isNaN(page) && page >= 1 && page <= this.totalPages) {
              this.renderPage(page);
            }
          }
        });
      }

      if (jumpBtn) {
        jumpBtn.addEventListener('click', () => {
          const page = parseInt(jumpInput.value);
          if (!isNaN(page) && page >= 1 && page <= this.totalPages) {
            this.renderPage(page);
          }
        });
      }
    },
  };

  const toolbarBtns = document.querySelectorAll('.toolbar-btn')
  toolbarBtns.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const contentSections = document.querySelectorAll('.content-section')
      contentSections.forEach(section => section.classList.add('hidden'))

      if (index === 0) {
        document.getElementById('content-home').classList.remove('hidden')
      } else if (index === 1) {
        document.getElementById('content-homework').classList.remove('hidden')
        await homeworkPagination.init()
        // 重新设置作业卡片的事件委托
        setupHomeworkCardEvents()
      }
    })
  })

  // 筛选表单收起/展开
  const toggleFilter = document.querySelector('.toggle-filter')
  toggleFilter.addEventListener('click', () => {
    const filterSidebar = document.querySelector('.filter-sidebar')
    const filterForm = document.querySelector('.filter-form')
    const filterTitle = document.querySelector('.filter-header h4')

    filterSidebar.classList.toggle('collapsed')

    if (filterSidebar.classList.contains('collapsed')) {
      if (filterForm) filterForm.style.display = 'none'
      if (filterTitle) filterTitle.style.display = 'none'
      toggleFilter.textContent = '≡'
    } else {
      if (filterForm) filterForm.style.display = 'block'
      if (filterTitle) filterTitle.style.display = 'block'
      toggleFilter.textContent = '≡'
    }
  })


  // 增加作业表单处理
  const addHomeworkForm = document.getElementById('addHomeworkForm')
  addHomeworkForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    // 表单验证
    if (!addHomeworkForm.checkValidity()) {
      e.stopPropagation()
      addHomeworkForm.classList.add('was-validated')
      return
    }

    // 收集表单数据
    const formData = {
      title: document.getElementById('homework-title').value,
      description: document.getElementById('homework-description').value,
      department: document.getElementById('homework-department').value,
      deadline: document.getElementById('homework-deadline').value,
      allow_late: document.getElementById('homework-allow-late').checked
    }

    try {
      // 提交到后端API
      const response = await request('/homework', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('添加作业失败')
      }

      const result = await response.json()

      if (result.code === 0) {
        // 添加成功
        console.log('添加作业成功:', result)
        alert('作业添加成功！')

        // 关闭模态弹窗
        const modal = bootstrap.Modal.getInstance(document.getElementById('addHomeworkModal'))
        modal.hide()

        // 重置表单
        addHomeworkForm.reset()
        addHomeworkForm.classList.remove('was-validated')

        // 这里可以添加刷新作业列表的逻辑
      } else {
        // 业务逻辑错误
        console.log('添加作业失败:', result)
        alert(result.msg || '添加作业失败')
      }
    } catch (error) {
      // 网络错误或其他错误
      console.error('添加作业时出错:', error)
      alert('添加作业时出错，请稍后再试')
    }
  })

  // 修改作业表单处理
  const editHomeworkForm = document.getElementById('editHomeworkForm')
  if (editHomeworkForm) {
    editHomeworkForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      // 表单验证
      if (!editHomeworkForm.checkValidity()) {
        e.stopPropagation()
        editHomeworkForm.classList.add('was-validated')
        return
      }

      // 找到提交按钮并禁用
      const submitButton = editHomeworkForm.querySelector('button[type="submit"]')
      if (submitButton) {
        submitButton.disabled = true
        submitButton.style.opacity = '0.6'
        submitButton.style.cursor = 'not-allowed'
      }

      // 收集表单数据
      const formData = {
        id: document.getElementById('edit-homework-id').value,
        title: document.getElementById('edit-homework-title').value,
        description: document.getElementById('edit-homework-description').value,
        deadline: document.getElementById('edit-homework-deadline').value,
        allow_late: document.getElementById('edit-homework-allow-late').checked
      }

      try {
        // 提交到后端API
        const response = await request(`/homework/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          throw new Error('修改作业失败')
        }

        const result = await response.json()

        if (result.code === 0) {
          // 修改成功
          console.log('修改作业成功:', result)
          alert('作业修改成功！')

          // 关闭模态弹窗
          const modal = bootstrap.Modal.getInstance(document.getElementById('editHomeworkModal'))
          modal.hide()

          // 重置表单
          editHomeworkForm.reset()
          editHomeworkForm.classList.remove('was-validated')

          // 重新启用所有功能按钮
          const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
          allButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = '';
          });

          // 这里可以添加刷新作业列表的逻辑
        } else {
          // 业务逻辑错误
          console.log('修改作业失败:', result)
          alert(result.msg || '修改作业失败')
        }
      } catch (error) {
        // 网络错误或其他错误
        console.error('修改作业时出错:', error)
        alert('修改作业时出错，请稍后再试')
      } finally {
        // 重新启用提交按钮
        if (submitButton) {
          submitButton.disabled = false
          submitButton.style.opacity = '1'
          submitButton.style.cursor = ''
        }

        // 重新启用所有功能按钮
        const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
        allButtons.forEach(button => {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = '';
        });
      }
    })
  }


  // 添加作业卡片的事件委托
  function setupHomeworkCardEvents() {
    const homeworkGrid = document.getElementById('homeworkGrid');
    if (homeworkGrid) {
      // 点击事件委托
      homeworkGrid.addEventListener('click', (e) => {
        e.stopPropagation();

        // 处理查看按钮点击
        if (e.target.classList.contains('view-btn')) {
          const viewDropdown = e.target.closest('.view-dropdown');
          if (viewDropdown) {
            // 关闭所有其他打开的下拉菜单
            document.querySelectorAll('.view-dropdown').forEach(dropdown => {
              if (dropdown !== viewDropdown) {
                dropdown.classList.remove('active');
              }
            });
            // 切换当前下拉菜单显示/隐藏
            viewDropdown.classList.toggle('active');
          }
        }

        // 处理查看作业菜单项点击
        else if (e.target.classList.contains('view-homework')) {
          const viewDropdown = e.target.closest('.view-dropdown');
          if (viewDropdown) {
            viewDropdown.classList.remove('active');
            const homeworkCard = viewDropdown.closest('.homework-card');
            const homeworkId = homeworkCard.dataset.homeworkId;
            if (homeworkId) {
              homeworkPagination.viewHomeworkDetail(homeworkId);
            }
          }
        }

        // 处理修改作业菜单项点击
        else if (e.target.classList.contains('edit-homework')) {
          const viewDropdown = e.target.closest('.view-dropdown');
          if (viewDropdown) {
            viewDropdown.classList.remove('active');
            const homeworkCard = viewDropdown.closest('.homework-card');
            const homeworkId = homeworkCard.dataset.homeworkId;
            if (homeworkId) {
              // 禁用所有功能按钮，防止重复请求
              const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
              allButtons.forEach(button => {
                button.disabled = true;
                button.style.opacity = '0.6';
                button.style.cursor = 'not-allowed';
              });

              // 获取作业详情并填充模态框
              async function getHomeworkDetail() {
                try {
                  const response = await request(`/homework/${homeworkId}`, {
                    method: 'GET'
                  });

                  if (!response.ok) {
                    throw new Error('获取作业详情失败，状态码：' + response.status);
                  }

                  const result = await response.json();

                  if (result.code === 0 && result.data) {
                    const homework = result.data;
                    // 填充修改作业模态框数据
                    document.getElementById('edit-homework-id').value = homework.id;
                    document.getElementById('edit-homework-title').value = homework.title || '';
                    document.getElementById('edit-homework-description').value = homework.description || '';
                    // 填充截止时间
                    if (homework.deadline) {
                      const deadline = new Date(homework.deadline);
                      const localDateTime = deadline.toISOString().slice(0, 16);
                      document.getElementById('edit-homework-deadline').value = localDateTime;
                    }
                    // 填充允许补交
                    document.getElementById('edit-homework-allow-late').checked = homework.allow_late || false;
                    // 显示修改作业模态框
                    const editModal = new bootstrap.Modal(document.getElementById('editHomeworkModal'));
                    editModal.show();
                  } else {
                    throw new Error('获取作业详情失败：' + (result.msg || '未知错误'));
                  }
                } catch (error) {
                  console.error('获取作业详情时出错:', error);
                  alert('获取作业详情时出错，请稍后再试');
                } finally {
                  // 重新启用所有功能按钮
                  const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
                  allButtons.forEach(button => {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = '';
                  });
                }
              }
              getHomeworkDetail();
            }
          }
        }

        // 处理删除作业菜单项点击
        else if (e.target.classList.contains('delete-homework')) {

          const viewDropdown = e.target.closest('.view-dropdown');
          if (viewDropdown) {
            viewDropdown.classList.remove('active');
            const homeworkCard = viewDropdown.closest('.homework-card');
            const homeworkId = homeworkCard.dataset.homeworkId;
            if (homeworkId) {
              // 禁用所有功能按钮，防止重复请求
              const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
              allButtons.forEach(button => {
                button.disabled = true;
                button.style.opacity = '0.6';
                button.style.cursor = 'not-allowed';
              });

              window.currentDeleteHomeworkId = homeworkId;
              const deleteModal = new bootstrap.Modal(document.getElementById('deleteHomeworkModal'));
              deleteModal.show();

              // 监听模态框关闭事件，重新启用按钮
              const modalElement = document.getElementById('deleteHomeworkModal');
              modalElement.addEventListener('hidden.bs.modal', function handler() {
                // 重新启用所有功能按钮
                const allButtons = document.querySelectorAll('.view-btn, .view-homework, .edit-homework, .delete-homework');
                allButtons.forEach(button => {
                  button.disabled = false;
                  button.style.opacity = '1';
                  button.style.cursor = '';
                });
                // 移除事件监听器，避免重复绑定
                modalElement.removeEventListener('hidden.bs.modal', handler);
              });
            }
          }
        }
      });
    }

    // 点击其他区域关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.view-dropdown')) {
        document.querySelectorAll('.view-dropdown').forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    });
  }

  // 聊天功能
  const chatInput = document.getElementById('chat-input')
  const sendBtn = document.getElementById('send-btn')
  const chatMessages = document.getElementById('chat-messages')
  const currentModelBtn = document.getElementById('current-model-btn')
  const modelDropdownMenu = document.getElementById('model-dropdown-menu')
  const modelOptions = document.querySelectorAll('.model-option')
  const selectedModelSpan = document.getElementById('selected-model')
  const apiKeyForm = document.getElementById('apiKeyForm')
  let currentModel = '模型'

  if (chatInput && sendBtn && chatMessages && currentModelBtn && modelDropdownMenu) {
    // 初始化时加载已保存的API Key
    loadApiKeys()

    // 模型下拉菜单切换
    currentModelBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      currentModelBtn.classList.toggle('open')
      modelDropdownMenu.classList.toggle('show')
    })

    // 点击其他区域关闭下拉菜单
    document.addEventListener('click', () => {
      currentModelBtn.classList.remove('open')
      modelDropdownMenu.classList.remove('show')
    })

    // 模型选择
    modelOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation()
        const model = option.dataset.model

        // 检查该模型的API Key是否已配置
        if (!hasApiKey(model)) {
          // 未配置，弹出配置模态框
          const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'))
          modal.show()
        } else {
          // 已配置，切换模型
          currentModel = model
          selectedModelSpan.textContent = option.textContent
        }

        // 关闭下拉菜单
        currentModelBtn.classList.remove('open')
        modelDropdownMenu.classList.remove('show')
      })
    })

    // API Key配置表单提交
    if (apiKeyForm) {
      apiKeyForm.addEventListener('submit', (e) => {
        e.preventDefault()

        // 保存API Key到本地存储
        const geminiKey = document.getElementById('gemini-api-key').value
        const deepseekKey = document.getElementById('deepseek-api-key').value

        if (geminiKey) {
          localStorage.setItem('gemini_api_key', geminiKey)
        }
        if (deepseekKey) {
          localStorage.setItem('deepseek_api_key', deepseekKey)
        }

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'))
        modal.hide()

        alert('API Key配置保存成功！')
      })
    }

    // 发送消息函数
    async function sendMessage() {
      //trim是去除空格
      const message = chatInput.value.trim()
      if (!message) return

      // 检查当前模型的API Key是否已配置
      if (!hasApiKey(currentModel)) {
        alert('请先配置' + (currentModel === 'gemini' ? 'Gemini' : 'DeepSeek') + '的API Key！')
        // 弹出配置模态框
        const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'))
        modal.show()
        return
      }

      // 添加用户消息
      addMessage('user', message)

      // 清空输入框
      chatInput.value = ''

      // 显示加载状态
      const loadingMessage = addMessage('ai', '正在思考...')

      // 调用后端API
      try {
        const response = await request('/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: message,
            model: currentModel
          })
        })

        if (!response.ok) {
          throw new Error('API请求失败，状态码：' + response.status)
        }

        const result = await response.json()

        if (result.code === 0 && result.data && result.data.reply) {
          // 移除加载消息
          console.assert(result.data.reply)
          loadingMessage.remove()
          // 显示AI回复
          addMessage('ai', result.data.reply)
        } else {
          throw new Error('API返回格式错误或无回复内容')
        }

      } catch (error) {
        console.error('AI请求失败:', error)
        // 移除加载消息
        loadingMessage.remove()
        // 显示错误消息
        addMessage('ai', '抱歉，请求AI服务失败：' + error.message)
      }
    }

    // 添加消息到聊天区域
    function addMessage(sender, content) {
      const messageDiv = document.createElement('div')
      messageDiv.className = `message ${sender}-message`

      if (sender === 'user') {
        messageDiv.innerHTML = `
          <div class="message-content user-content">
            <p>${content}</p>
          </div>
        `
      } else {
        messageDiv.innerHTML = `
          <div class="message-content ai-content">
            <div class="ai-avatar">${currentModel === 'gemini' ? 'G' : 'D'}</div>
            <div class="ai-text">
              <p>${content}</p>
            </div>
          </div>
        `
      }

      chatMessages.appendChild(messageDiv)
      // 自动滚动到最新消息
      chatMessages.scrollTop = chatMessages.scrollHeight

      return messageDiv
    }

    // 检查API Key是否已配置
    function hasApiKey(model) {
      const key = localStorage.getItem(model + '_api_key')
      return key && key.trim() !== ''
    }

    // 加载已保存的API Key
    function loadApiKeys() {
      const geminiKey = localStorage.getItem('gemini_api_key')
      const deepseekKey = localStorage.getItem('deepseek_api_key')

      if (geminiKey) {
        document.getElementById('gemini-api-key').value = geminiKey
      }
      if (deepseekKey) {
        document.getElementById('deepseek-api-key').value = deepseekKey
      }
    }

    // 发送按钮点击事件
    sendBtn.addEventListener('click', sendMessage)

    // 回车键发送
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage()
      }
    })

    // 添加欢迎消息
    setTimeout(() => {
      addMessage('ai', `请先点击模型按钮配置api key`)
    }, 500)
  }

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