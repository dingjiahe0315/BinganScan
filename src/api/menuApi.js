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
 * 返回格式: { code: 200, body: [...] } 兼容实际API格式
 */
export async function getMockMedicalRecordMenu() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        code: 200,
        body: [
          {
            medicalRecordArchiveTpId: '7204502',
            code: '-1',
            name: '未编制目录',
            serialNumber: -1
          },
          {
            medicalRecordArchiveTpId: '7204503',
            code: '1',
            name: '病案首页',
            serialNumber: 1
          },
          {
            medicalRecordArchiveTpId: '7204504',
            code: '2',
            name: '入院记录',
            serialNumber: 2
          },
          {
            medicalRecordArchiveTpId: '7204505',
            code: '3',
            name: '出院相关记录',
            serialNumber: 3,
            children: [
              { 
                medicalRecordArchiveTpId: '7204505-1',
                code: '3.1',
                name: '出院（死亡）记录',
                serialNumber: 31
              },
              { 
                medicalRecordArchiveTpId: '7204505-2',
                code: '3.2',
                name: '患者健康教育处方',
                serialNumber: 32
              },
              { 
                medicalRecordArchiveTpId: '7204505-3',
                code: '3.3',
                name: '出院医疗证明',
                serialNumber: 33
              }
            ]
          },
          {
            medicalRecordArchiveTpId: '7204506',
            code: '4',
            name: '病程记录',
            serialNumber: 4,
            children: [
              { 
                medicalRecordArchiveTpId: '7204506-1',
                code: '4.1',
                name: '出院（死亡）讨论',
                serialNumber: 41
              }
            ]
          },
          {
            medicalRecordArchiveTpId: '7204507',
            code: '5',
            name: '知情谈话记录',
            serialNumber: 5
          },
          {
            medicalRecordArchiveTpId: '7204508',
            code: '6',
            name: '手术相关记录与资料',
            serialNumber: 6
          },
          {
            medicalRecordArchiveTpId: '7204509',
            code: '7',
            name: '审批单',
            serialNumber: 7
          },
          {
            medicalRecordArchiveTpId: '7204510',
            code: '8',
            name: '会诊单',
            serialNumber: 8
          },
          {
            medicalRecordArchiveTpId: '7204511',
            code: '9',
            name: '专科评估记录单',
            serialNumber: 9
          },
          {
            medicalRecordArchiveTpId: '7204512',
            code: '10',
            name: '疑难病历讨论',
            serialNumber: 10
          },
          {
            medicalRecordArchiveTpId: '7204513',
            code: '11',
            name: '检查检验报告',
            serialNumber: 11
          },
          {
            medicalRecordArchiveTpId: '7204514',
            code: '12',
            name: '体温单',
            serialNumber: 12
          },
          {
            medicalRecordArchiveTpId: '7204515',
            code: '13',
            name: '医嘱单',
            serialNumber: 13
          },
          {
            medicalRecordArchiveTpId: '7204516',
            code: '14',
            name: '护理记录',
            serialNumber: 14
          },
          {
            medicalRecordArchiveTpId: '7204517',
            code: '15',
            name: '其他相关资料',
            serialNumber: 15
          }
        ]
      });
    }, 300); // 模拟网络延迟
  });
}