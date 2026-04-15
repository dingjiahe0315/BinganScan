/**
 * 菜单相关API服务
 * 模仿图片中的API写法风格
 */

import { request } from '../utils/request';

/**
 * 获取病案扫描左侧树状菜单数据
 * @param {Object} [params] - 可选参数
 * @returns {Promise<Array>} 返回菜单数据数组
 */
export function getMedicalRecordMenu(params = {}) {
  // 使用图片中的API写法风格
  return request({
    serviceId: 'armgt.medicalRecordMenuServiceRpc',
    serverMethod: 'getMedicalRecordMenu',
    data: {
      ...params,
      timestamp: Date.now(), // 添加时间戳防止缓存
    }
  });
}

/**
 * 获取病案扫描左侧树状菜单数据（备用API）
 * 如果第一个API失败，可以尝试这个
 */
export function getMedicalRecordMenuV2(params = {}) {
  return request({
    serviceId: 'armgt.medicalRecordServiceRpc',
    serverMethod: 'getRecordMenuList',
    data: params
  });
}

/**
 * 获取菜单数据的模拟函数（用于开发/测试）
 * 当真实API不可用时使用此模拟数据
 */
export async function getMockMedicalRecordMenu() {
  // 返回与当前写死的menuItems相同格式的模拟数据
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        menuItems: [
          {
            key: 'overview',
            label: '总览',
            icon: 'folder'
          },
          {
            key: 'record-home',
            label: '病案首页',
            icon: 'file-text'
          },
          {
            key: 'admission-record',
            label: '入院记录',
            icon: 'file-text'
          },
          {
            key: 'discharge-related',
            label: '出院相关记录',
            icon: 'folder',
            children: [
              { 
                key: 'discharge-death', 
                label: '出院（死亡）记录', 
                icon: 'file-pdf'
              },
              { 
                key: 'health-education', 
                label: '患者健康教育处方', 
                icon: 'file-pdf'
              },
              { 
                key: 'discharge-certificate', 
                label: '出院医疗证明', 
                icon: 'file-pdf'
              }
            ]
          },
          {
            key: 'progress-note',
            label: '病程记录',
            icon: 'folder',
            children: [
              { 
                key: 'discharge-discussion', 
                label: '出院（死亡）讨论', 
                icon: 'file-pdf'
              }
            ]
          },
          {
            key: 'consultation-record',
            label: '知情谈话记录',
            icon: 'folder'
          },
          {
            key: 'surgery-related',
            label: '手术相关记录与资料',
            icon: 'folder'
          },
          {
            key: 'approval-sheet',
            label: '审批单',
            icon: 'folder'
          },
          {
            key: 'consultation-sheet',
            label: '会诊单',
            icon: 'folder'
          },
          {
            key: 'specialist-assessment',
            label: '专科评估记录单',
            icon: 'folder'
          },
          {
            key: 'difficult-case',
            label: '疑难病历讨论',
            icon: 'folder'
          },
          {
            key: 'lab-report',
            label: '检查检验报告',
            icon: 'folder'
          },
          {
            key: 'temperature-sheet',
            label: '体温单',
            icon: 'folder'
          },
          {
            key: 'doctor-order',
            label: '医嘱单',
            icon: 'folder'
          },
          {
            key: 'nursing-record',
            label: '护理记录',
            icon: 'folder'
          },
          {
            key: 'other-related',
            label: '其他相关资料',
            icon: 'folder'
          }
        ]
      });
    }, 300); // 模拟网络延迟
  });
}