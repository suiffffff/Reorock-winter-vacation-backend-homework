




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

// switchPage()


function setupLogin() {
  document.querySelector('.login-btn').addEventListener('click', () => {
    const loginForm = document.querySelector('.login-form')
    const loginObj = serialize(loginForm, { hash: true, empty: true })
    // console.log(loginForm)
    // console.log(loginObj)
    fetch('http://', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <access_token>'
      },
      body: JSON.stringify(loginObj)
    }).then(result => {
      if (result.code===0) {
        
      } else {
        const toastDom = document.querySelector('.my-toast')
        const toast = new bootstrap.Toast(toastDom)
        toast.show()
        throw new Error('登录失败，状态码：' + response.status);
      }
    })
  })
}
setupLogin()





