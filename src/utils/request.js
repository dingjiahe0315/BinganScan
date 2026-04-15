/**
 * 通用请求工具
 * 模拟图片中的API写法风格
 */

/**
 * 通用请求函数
 * @param {Object} params - 请求参数
 * @param {string} params.serviceId - 服务ID
 * @param {string} params.serverMethod - 服务器方法
 * @param {Object} [params.data] - 请求数据
 * @param {string} [params.url] - 自定义请求URL（可选）
 * @returns {Promise<any>} 返回Promise
 */
export function request(params) {
  const { serviceId, serverMethod, data = {}, url } = params;
  
  // 如果没有提供自定义URL，使用默认API地址
  const requestUrl = url || '/api/medical-record-service';
  
  // 构建请求体，模仿图片中的API格式
  const requestBody = {
    serviceId,
    serverMethod,
    ...data
  };
  
  console.log(`调用API: ${serviceId}.${serverMethod}`, requestBody);
  
  return fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      // 假设API返回格式为 { code: 0, data: {}, message: 'success' }
      if (result.code === 0) {
        return result.data;
      } else {
        throw new Error(result.message || `API调用失败: ${serviceId}.${serverMethod}`);
      }
    })
    .catch(error => {
      console.error(`API调用错误: ${serviceId}.${serverMethod}`, error);
      throw error;
    });
}

/**
 * 简化的请求函数（备用方案）
 * @param {Object} options - 请求选项
 * @param {string} options.url - 请求URL
 * @param {Object} [options.data] - 请求数据
 * @param {string} [options.method] - 请求方法，默认为GET
 * @returns {Promise<any>} 返回Promise
 */
export function simpleRequest(options) {
  const { url, data = {}, method = 'GET' } = options;
  
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  if (method !== 'GET' && data) {
    requestOptions.body = JSON.stringify(data);
  }
  
  console.log(`请求: ${method} ${url}`, data);
  
  return fetch(url, requestOptions)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(`请求错误: ${url}`, error);
      throw error;
    });
}