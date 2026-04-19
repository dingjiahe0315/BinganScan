import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Checkbox, 
  Button, 
  Input, 
  message,
  Modal,
  Row, 
  Col,
  Space,
  Progress,
  Image,
  Spin
} from 'antd';
import { 
  FolderOutlined, 
  FileTextOutlined
} from '@ant-design/icons';
import './index.css';
import * as UTIF from 'utif';
import { getMedicalRecordMenu } from './api';

const { Search } = Input;
const { Content, Sider } = Layout;

/**
 * 将Blob格式的图片转换为DataURL
 * @param {Blob|ArrayBuffer|string} blobData - 图片数据
 * @param {string} fileName - 文件名，用于判断图片格式
 * @param {string} mimeType - MIME类型（可选）
 * @returns {string|null} DataURL格式的图片数据
 */
const convertBlobToImage = async (blobData, fileName, mimeType = 'image/jpeg') => {
  try {
    const isTiff = fileName && (fileName.toLowerCase().endsWith('.tif') || fileName.toLowerCase().endsWith('.tiff'));
    
    // 如果是base64字符串，先转换为ArrayBuffer
    let arrayBuffer;
    if (typeof blobData === 'string') {
      // base64字符串转换为ArrayBuffer
      const binaryString = atob(blobData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else if (blobData instanceof ArrayBuffer) {
      arrayBuffer = blobData;
    } else {
      // Blob转换为ArrayBuffer
      arrayBuffer = await blobData.arrayBuffer();
    }
    
    if (isTiff) {
      // TIF/TIFF格式：使用UTIF库转换
      const ifds = UTIF.decode(arrayBuffer);
      
      if (ifds && ifds.length > 0) {
        const ifd = ifds[0];
        
        const width = ifd.t256?.[0] || ifd.tifw || ifd.width;
        const height = ifd.t257?.[0] || ifd.tifh || ifd.height;
        
        if (!width || !height) {
          throw new Error('无法获取TIF图片尺寸');
        }
        
        UTIF.decodeImage(arrayBuffer, ifd);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const rgba = UTIF.toRGBA8(ifd);
        
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.92);
      }
      
      throw new Error('无法解析 TIF 文件');
    } else {
      // 普通图片格式（JPEG/PNG/WebP等）：直接构建DataURL
      const uint8Array = new Uint8Array(arrayBuffer);
      // 分块转换以避免调用栈溢出
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        base64 += String.fromCharCode(...chunk);
      }
      return `data:${mimeType};base64,${btoa(base64)}`;
    }
  } catch (error) {
    console.error('转换图片失败:', error);
    return null;
  }
};

/**
 * 加载并解析TIF/TIFF格式的图片文件
 * @param {string} filePath - TIF文件的路径
 * @returns {string|null} JPEG格式的Data URL
 */
const loadTifImage = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const ifds = UTIF.decode(arrayBuffer);
    
    if (ifds && ifds.length > 0) {
      const ifd = ifds[0];
      UTIF.decodeImage(arrayBuffer, ifd);
      
      const canvas = document.createElement('canvas');
      canvas.width = ifd.width;
      canvas.height = ifd.height;
      const ctx = canvas.getContext('2d');
      
      const rgba = UTIF.toRGBA8(ifd);
      const imageData = ctx.createImageData(ifd.width, ifd.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);
      
      const resizeCanvas = document.createElement('canvas');
      const maxWidth = 400;
      const maxHeight = 560;
      
      let ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
      resizeCanvas.width = Math.floor(canvas.width * ratio);
      resizeCanvas.height = Math.floor(canvas.height * ratio);
      
      const resizeCtx = resizeCanvas.getContext('2d');
      resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height);
      
      return resizeCanvas.toDataURL('image/jpeg', 0.85);
    }
    
    throw new Error('无法解析 TIF 文件');
  } catch (error) {
    console.error('加载 TIF 图片失败:', error);
    return null;
  }
};

/**
 * 病案扫描主组件
 * 
 * 功能描述：
 * 1. 提供病案扫描的完整界面
 * 2. 包含左侧菜单栏、文档显示区域、扫描控制等功能
 * 3. 支持图片拖拽排序、分类、插入、替换等操作
 * 4. 集成WebSocket扫描和静态图片加载
 */
function MedicalRecordScan() {

  const [barcode, setBarcode] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('overview');
  const [expandedMenus, setExpandedMenus] = useState(['discharge-related', 'progress-note']);
  const [documents, setDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  // 新增状态：菜单数据
  const [rawMenuData, setRawMenuData] = useState([]);  // 存储原始菜单数据
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  // 扫描功能启用状态：当API调用失败时禁用所有扫描功能
  const [scanEnabled, setScanEnabled] = useState(true);
  // 拖拽排序状态
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // 菜单拖拽绑定状态
  const [draggedDocumentKey, setDraggedDocumentKey] = useState(null);
  // 图片与菜单绑定状态（menuCode存储图片绑定的菜单code）
  // 当前选中的菜单（用于过滤显示）
  const [selectedMenuKey, setSelectedMenuKey] = useState(null);

  /**
   * 获取菜单数据
   */
  useEffect(() => {
    const fetchMenuData = async () => {
      setMenuLoading(true);
      setMenuError(null);
      
      try {
        const response = await getMedicalRecordMenu();
        
        if (response && response.success && Array.isArray(response.data)) {
          setRawMenuData(response.data);
          const formattedMenuItems = formatMenuItems(response.data);
          setMenuItems(formattedMenuItems);
          setScanEnabled(true);
        } else {
          console.warn('API返回数据格式不正确', response);
          setMenuItems([]);
          setMenuError('API返回数据格式不正确');
          setScanEnabled(false);
        }
      } catch (error) {
        console.warn('获取菜单数据失败:', error.message);
        setMenuItems([]);
        setMenuError(`获取菜单失败: ${error.message}`);
        setScanEnabled(false);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  /**
   * 当文档状态改变时，重新格式化菜单项以更新绑定状态样式
   */
  useEffect(() => {
    if (rawMenuData.length > 0) {
      const formattedMenuItems = formatMenuItems(rawMenuData);
      setMenuItems(formattedMenuItems);
    }
  }, [documents]);  // 依赖documents状态，每次文档变化时重新格式化菜单



  /**
   * 格式化菜单项数据为Ant Design Menu格式
   * @param {Array} items - 菜单项数组
   * @returns {Array} 格式化后的菜单项数组
   */
  const formatMenuItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    const formattedItems = items.map(item => {
      const code = String(item.code || item.medicalRecordArchiveTpId || item.id || item.key);
      const key = code;
      const name = item.name || item.label || '未命名';
      
      const boundCount = getBoundCountForMenu(code);
      
      let label = (
        <div 
          className={`menu-drop-zone ${boundCount > 0 ? 'menu-item-bound' : ''}`}
          onDragOver={handleMenuDragOver}
          onDragEnter={handleMenuDragEnter}
          onDragLeave={handleMenuDragLeave}
          onDrop={(e) => {
            e.stopPropagation();
            handleMenuDrop(e, key, code);
          }}
          onDragEnd={handleMenuDragEnd}
        >
          <span>{name}</span>
        </div>
      );
      
      let children = null;
      const hasChildrenProperty = item.children !== undefined && Array.isArray(item.children);
      
      if (hasChildrenProperty) {
        children = formatMenuItems(item.children);
      }
      
      const icon = hasChildrenProperty ? <FolderOutlined /> : <FileTextOutlined />;
      
      const formattedItem = {
        key: key,
        label: label,
        icon: icon,
        menuCode: code,
        className: boundCount > 0 ? 'menu-item-bound' : ''
      };
      
      if (hasChildrenProperty) {
        formattedItem.children = children;
      }
      
      return formattedItem;
    });
    
    return formattedItems.sort((a, b) => {
      const originalA = items.find(item => 
        String(item.code || item.medicalRecordArchiveTpId || item.id || item.key) === a.key
      );
      const originalB = items.find(item => 
        String(item.code || item.medicalRecordArchiveTpId || item.id || item.key) === b.key
      );
      
      if (!originalA || !originalB) return 0;
      
      const aNum = originalA.serialNumber !== undefined ? originalA.serialNumber : 
                  parseInt(originalA.code) || parseFloat(originalA.code) || 0;
      const bNum = originalB.serialNumber !== undefined ? originalB.serialNumber : 
                  parseInt(originalB.code) || parseFloat(originalB.code) || 0;
      
      return aNum - bNum;
    });
  };

  const selectedCount = documents.filter(doc => doc.isSelected).length;
  const classifiedCount = documents.filter(doc => doc.isClassified).length;
  const unclassifiedCount = documents.length - classifiedCount;

  // ==================== 拖拽排序处理函数 ====================
  /**
   * 处理拖拽开始事件
   * 
   * 功能描述：
   * 1. 记录被拖拽元素的索引
   * 2. 设置拖拽操作类型为'move'（移动）
   * 3. 将拖拽数据存储在dataTransfer对象中
   * 4. 为被拖拽元素添加视觉样式（通过CSS类名）
   * 
   * @param {DragEvent} e - HTML5拖拽事件对象
   * @param {number} index - 被拖拽元素在文档数组中的索引
   */
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => {
      e.target.closest('.document-card')?.classList.add('dragging');
    }, 0);
  };

  /**
   * 处理拖拽悬停事件（元素被拖拽到目标上方时持续触发）
   * 
   * 功能描述：
   * 1. 阻止浏览器默认行为（否则不会触发drop事件）
   * 2. 设置拖拽视觉效果为'move'
   * 3. 如果悬停位置不是被拖拽元素本身，则更新dragOverIndex状态
   * 
   * @param {DragEvent} e - HTML5拖拽事件对象
   * @param {number} index - 当前悬停元素在文档数组中的索引
   */
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  /**
   * 处理拖拽进入事件（元素首次进入目标区域时触发）
   * 
   * 功能描述：
   * 1. 阻止浏览器默认行为
   * 2. 如果进入位置不是被拖拽元素本身，则更新dragOverIndex状态
   * 
   * @param {DragEvent} e - HTML5拖拽事件对象
   * @param {number} index - 当前进入元素在文档数组中的索引
   */
  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  /**
   * 处理拖拽离开事件（元素离开目标区域时触发）
   * 
   * 功能描述：
   * 1. 检查拖拽是否真正离开了当前元素（而不是进入其子元素）
   * 2. 如果真正离开，则清除dragOverIndex状态
   * 
   * @param {DragEvent} e - HTML5拖拽事件对象
   */
  const handleDragLeave = (e) => {
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  /**
   * 处理拖拽放置事件（元素被释放时触发）
   * 
   * 功能描述：
   * 1. 阻止浏览器默认行为（否则可能会打开链接等）
   * 2. 检查放置位置是否有效（不是拖拽元素本身）
   * 3. 重新排序文档数组：将被拖拽元素从原位置移除，插入到新位置
   * 4. 更新状态，显示成功消息
   * 5. 清理拖拽状态
   * 
   * @param {DragEvent} e - HTML5拖拽事件对象
   * @param {number} dropIndex - 放置位置在文档数组中的索引
   */
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newDocuments = [...documents];
    const draggedItem = newDocuments[draggedIndex];
    newDocuments.splice(draggedIndex, 1);
    newDocuments.splice(dropIndex, 0, draggedItem);

    setDocuments(newDocuments);
    message.success(`已将图片移动到第 ${dropIndex + 1} 位`);

    handleDragEnd();
  };

  /**
   * 处理拖拽结束事件（无论拖拽是否成功都会触发）
   * 
   * 功能描述：
   * 1. 重置拖拽相关状态（draggedIndex和dragOverIndex）
   * 2. 移除所有拖拽相关的CSS样式类
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    document.querySelectorAll('.document-card.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.document-card.drag-over').forEach(el => el.classList.remove('drag-over'));
  };

  // ==================== 拖拽绑定菜单处理函数 ====================

  /**
   * 获取指定菜单项绑定的图片数量
   * 
   * @param {string} menuCode - 菜单项code
   * @returns {number} 绑定的图片数量
   */
  const getBoundCountForMenu = (menuCode) => {
    return documents.filter(doc => doc.menuCode && doc.menuCode === menuCode).length;
  };

  /**
   * 处理图片拖拽开始（拖向菜单）
   * 
   * @param {DragEvent} e - 拖拽事件
   * @param {string} docKey - 图片的key
   */
  const handleDocumentDragStartToMenu = (e, docKey) => {
    setDraggedDocumentKey(docKey);
    e.dataTransfer.setData('documentKey', docKey);
    e.dataTransfer.effectAllowed = 'copy';
  };

  /**
   * 处理菜单项拖拽悬停
   * 
   * @param {DragEvent} e - 拖拽事件
   */
  const handleMenuDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('menu-drop-hover');
  };

  /**
   * 处理菜单项拖拽进入
   * 
   * @param {DragEvent} e - 拖拽事件
   */
  const handleMenuDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('menu-drop-hover');
  };

  /**
   * 处理菜单项拖拽离开
   * 
   * @param {DragEvent} e - 拖拽事件
   */
  const handleMenuDragLeave = (e) => {
    e.currentTarget.classList.remove('menu-drop-hover');
  };

  /**
   * 处理图片拖拽放置到菜单项
   * 
   * @param {DragEvent} e - 拖拽事件
   * @param {string} menuKey - 菜单项key
   * @param {string} menuCode - 菜单项code
   */
  const handleMenuDrop = (e, menuKey, menuCode) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('menu-drop-hover');

    const docKey = e.dataTransfer.getData('documentKey');
    if (!docKey) return;

    setDocuments(docs => docs.map(doc => {
      if (doc.key === docKey) {
        return { ...doc, menuCode: menuCode, isClassified: true };
      }
      return doc;
    }));

    setDraggedDocumentKey(null);
    message.success('图片已绑定到菜单项');
  };

  /**
   * 处理菜单拖拽结束
   */
  const handleMenuDragEnd = () => {
    setDraggedDocumentKey(null);
    document.querySelectorAll('.menu-drop-hover').forEach(el => {
      el.classList.remove('menu-drop-hover');
    });
  };

  // ==================== 菜单点击和过滤 ====================

  const handleMenuOpenChange = (keys) => {
    setExpandedMenus(keys);
  };

  const handleMenuClick = ({ key }) => {
    const findMenuItem = (items, targetKey) => {
      for (const menuItem of items) {
        if (menuItem.key === targetKey) return menuItem;
        if (menuItem.children) {
          const found = findMenuItem(menuItem.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };
    const clickedItem = findMenuItem(menuItems, key);
    
    if (clickedItem && !clickedItem.children) {
      const menuCode = clickedItem.menuCode || key;
      setSelectedMenuKey(menuCode);
      setSelectedMenu(key);
    } else {
      setSelectedMenuKey(null);
      setSelectedMenu(key);
    }
  };

  // 过滤文档：根据选中的菜单项显示绑定的图片
  // 总览模式：显示所有图片
  // 菜单模式：只显示绑定到该菜单的图片
  const filteredDocuments = selectedMenuKey
    ? documents.filter(doc => doc.menuCode && doc.menuCode === selectedMenuKey)
    : documents;

  /**
   * 全选/取消全选处理函数
   * 
   * 功能描述：
   * 1. 切换全选状态
   * 2. 更新所有文档的选中状态
   */
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setDocuments(docs => docs.map(doc => ({
      ...doc,
      isSelected: newSelectAll
    })));
  };

  const handleSelectDocument = (docKey) => {
    setDocuments(docs => docs.map(doc => 
      doc.key === docKey 
        ? { ...doc, isSelected: !doc.isSelected }
        : doc
    ));
  };

  const handleDeleteDocument = (docKey) => {
    setDocuments(docs => docs.filter(doc => doc.key !== docKey));
    message.success('删除成功');
  };

  /**
   * 通过WebSocket获取扫描图片
   * @param {Object} params - 扫描参数
   * @returns {Array} 图片数据数组 [{blob, fileName}]
   */
  const fetchImagesFromWebSocket = (params = {}) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8080');
      ws.binaryType = 'blob';

      ws.onopen = () => {
        ws.send(`startScan:${JSON.stringify(params)}`);
      };

      const receivedImages = [];
      let timeoutId = null;
      let closeReceived = false;

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const text = event.data.toLowerCase();
          if (text.includes('completed') || text.includes('finished') || text.includes('done')) {
            clearTimeout(timeoutId);
            closeReceived = true;
            ws.close();
            resolve(receivedImages);
          }
          return;
        }

        if (event.data instanceof Blob) {
          receivedImages.push({
            blob: event.data,
            fileName: `image-${receivedImages.length}.tiff`
          });
        }
      };

      ws.onclose = () => {
        closeReceived = true;
        clearTimeout(timeoutId);
        resolve(receivedImages);
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('WebSocket连接失败'));
      };

      timeoutId = setTimeout(() => {
        if (!closeReceived) {
          ws.close();
          reject(new Error('接收图片超时'));
        }
      }, 60000);
    });
  };

  /**
   * 开始扫描处理函数
   */
  const handleStartScan = async () => {
    if (isScanning) {
      message.warning('正在扫描中，请稍候...');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    message.info('开始扫描...');

    try {
      const params = {
        ColorMode: "黑白",
        Resolution: 600,
        ShowInterface: false,
        UseFeeder: true,
        IsDuplex: true
      };

      const imagesData = await fetchImagesFromWebSocket(params);

      if (imagesData.length === 0) {
        message.warning('未获取到扫描图片');
        setIsScanning(false);
        return;
      }

      message.info('图片数据接收完成');

      const categories = ['病案首页', '入院记录', '首次病程', '出院记录', '病程记录', '检验报告'];

      for (let i = 0; i < imagesData.length; i++) {
        const imageData = imagesData[i];
        const fileName = imageData.fileName || `image-${i}.tiff`;
        const category = imageData.category || categories[i % categories.length];

        console.log(`开始转换第 ${i + 1} 张图片:`, {
          fileName,
          blobSize: imageData.blob.size,
          blobType: imageData.blob.type
        });
          
        // 将Blob转换为可显示的图片URL
        const imageUrl = await convertBlobToImage(imageData.blob, fileName, 'image/tiff');
          
        console.log(`第 ${i + 1} 张图片转换结果:`, imageUrl ? '成功' : '失败', imageUrl?.substring(0, 50));

        if (!imageUrl) {
          console.warn(`第 ${i + 1} 张图片转换失败`);
          continue;
        }

        setDocuments(prevDocs => [
          ...prevDocs,
          {
            key: `ws-${i}-${Date.now()}`,
            order: prevDocs.length + 1,
            category: category,
            image: imageUrl,
            fullImage: imageUrl,
            fileName: fileName,
            isSelected: false,
            isClassified: false
          }
        ]);

        setScanProgress(Math.round(((i + 1) / imagesData.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTimeout(() => {
        setIsScanning(false);
        message.success(`扫描完成！共加载 ${imagesData.length} 张图片`);
      }, 500);
    } catch (error) {
      console.error('处理图片数据失败:', error);
      setIsScanning(false);
      message.warning('扫描已取消');
    }
  };



  const handleInsertPage = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) {
      message.warning('请先选择要在其后插入的图片');
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      message.info('正在获取插入图片...');

      const imagesData = await fetchImagesFromWebSocket({
        ColorMode: "黑白",
        Resolution: 600,
        ShowInterface: false,
        UseFeeder: true,
        IsDuplex: true
      });

      if (imagesData.length === 0) {
        message.warning('未获取到插入图片');
        setIsScanning(false);
        return;
      }

      const imageUrl = await convertBlobToImage(imagesData[0].blob, imagesData[0].fileName, 'image/tiff');
      if (!imageUrl) {
        message.error('图片转换失败');
        setIsScanning(false);
        return;
      }

      const newDocuments = [...documents];
      let insertCount = 0;
      selectedDocs.forEach(doc => {
        const index = newDocuments.findIndex(d => d.key === doc.key);
        if (index !== -1) {
          newDocuments.splice(index + 1, 0, {
            key: `ws-insert-${Date.now()}-${insertCount}`,
            order: newDocuments.length + 1,
            category: '插入页面',
            image: imageUrl,
            fullImage: imageUrl,
            fileName: imagesData[0].fileName,
            isSelected: false,
            isClassified: false
          });
          insertCount++;
        }
      });

      setDocuments(newDocuments);
      setIsScanning(false);
      message.success(`成功插入 ${insertCount} 张图片`);
    } catch (error) {
      console.error('插描失败:', error);
      setIsScanning(false);
      message.error('插描失败');
    }
  };

  /**
   * 替扫处理函数（替换扫描）
   * 通过WebSocket获取图片替换选中的图片
   */
  const handleRescan = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) {
      message.warning('请先选择要替换的图片');
      return;
    }
    if (selectedDocs.length > 1) {
      message.warning('只能选择一张图片进行替扫');
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      message.info('正在获取替扫图片...');

      const imagesData = await fetchImagesFromWebSocket({
        ColorMode: "黑白",
        Resolution: 600,
        ShowInterface: false,
        UseFeeder: true,
        IsDuplex: true
      });

      if (imagesData.length === 0) {
        message.warning('未获取到替扫图片');
        setIsScanning(false);
        return;
      }

      const imageUrl = await convertBlobToImage(imagesData[0].blob, imagesData[0].fileName, 'image/tiff');
      if (!imageUrl) {
        message.error('图片转换失败');
        setIsScanning(false);
        return;
      }

      const selectedDoc = selectedDocs[0];
      setDocuments(docs => docs.map(doc => 
        doc.key === selectedDoc.key 
          ? {
              ...doc,
              image: imageUrl,
              fullImage: imageUrl,
              fileName: imagesData[0].fileName,
              isClassified: false
            }
          : doc
      ));

      setIsScanning(false);
      message.success('替扫成功');
    } catch (error) {
      console.error('替扫失败:', error);
      setIsScanning(false);
      message.error('替扫失败');
    }
  };

  /**
   * 扫描暂存处理函数
   * 
   * 功能描述：
   * 1. 显示扫描暂存成功的消息
   * 2. 用于临时保存扫描进度
   */
  const handleSaveTemp = () => {
    message.success('扫描暂存成功');
  };

  /**
   * 扫描完成处理函数
   * 
   * 功能描述：
   * 1. 显示确认对话框，展示已分类文档数量
   * 2. 用户确认后显示扫描完成消息
   */
  const handleScanComplete = () => {
    Modal.confirm({
      title: '确认完成扫描？',
      content: `已完成 ${classifiedCount} 页文档的分类`,
      onOk() {
        message.success('扫描完成');
      }
    });
  };

  return (
    <Layout className="medical-record-scan">
      <div className="title-bar">
        <h1 className="page-title">病案扫描</h1>
        <span className="close-btn">×</span>
      </div>
      
      <div className="info-bar">
        <Row align="middle" justify="space-between" style={{ width: '100%' }}>
          <Col>
            <Space size="middle">
              <Space size="small">
                <span className="info-label">病案条码：</span>
                <Search
                  placeholder="扫码枪或者手工调入"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  style={{ width: 180 }}
                  allowClear
                />
              </Space>
              <Space size="small">
                <span className="info-label">病人姓名：</span>
                <span className="info-value">李二二</span>
              </Space>
              <Space size="small">
                <span className="info-label">住院次：</span>
                <span className="info-value">第2次住院</span>
              </Space>
              <Space size="small">
                <span className="info-label">出院科室：</span>
                <span className="info-value">消化内科</span>
              </Space>
              <Space size="small">
                <span className="info-label">出院日期：</span>
                <span className="info-value">2024-08-09</span>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size="middle" align="center">
              <Button 
                type="primary"
                onClick={handleSelectAll}
                className="select-all-btn"
              >
                全选
              </Button>
              <Button 
                type="primary"
                disabled={selectedCount === 0}
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除选中的 ${selectedCount} 张图片吗？`,
                    onOk() {
                      setDocuments(docs => docs.filter(doc => !doc.isSelected));
                      setSelectAll(false);
                      message.success(`删除成功，共删除 ${selectedCount} 张图片`);
                    }
                  });
                }}
              >
                删除
              </Button>
              <Space size="small">
                <Button 
                  type="primary" 
                  onClick={handleStartScan}
                  disabled={!scanEnabled || isScanning}
                >
                  开始扫描
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleInsertPage}
                  disabled={!scanEnabled || isScanning}
                >
                  插描
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleRescan}
                  disabled={!scanEnabled || isScanning}
                >
                  替扫
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSaveTemp}
                  disabled={!scanEnabled || isScanning}
                >
                  扫描暂存
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleScanComplete}
                  disabled={!scanEnabled || isScanning}
                >
                  扫描完成
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </div>

      {isScanning && (
        <div className="scan-progress-bar">
          <Progress 
            percent={scanProgress} 
            status="active"
            showInfo={true}
            format={(percent) => `扫描中... ${percent}%`}
          />
        </div>
      )}

      <Layout className="main-content">
        <Sider width={260} className="left-sidebar">
          {menuLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin size="large" tip="加载菜单中..." />
            </div>
          ) : menuError ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>菜单加载失败</div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>{menuError}</div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>未获取到数据</div>

            </div>
          ) : (
            <Menu
              mode="inline"
              selectedKeys={[selectedMenuKey || selectedMenu]}
              openKeys={expandedMenus}
              onOpenChange={handleMenuOpenChange}
              onClick={handleMenuClick}
              items={menuItems}
            />
          )}
        </Sider>

        <Content className="document-area">
          <div className="document-header">
            <div className="current-category">
              {selectedMenuKey ? `菜单项绑定的图片` : '总览'}
              {selectedMenuKey && (
                <span
                  className="close-icon"
                  onClick={() => {
                    setSelectedMenuKey(null);
                    setSelectedMenu('overview');
                  }}
                >
                  ×
                </span>
              )}
            </div>
          </div>
          
          <div className="document-grid">
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.key}
                className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${doc.menuCode && doc.menuCode !== '-1' ? 'bound' : ''}`}
                draggable
                onDragStart={(e) => {
                  // 同时支持两种拖拽：排序和绑定到菜单
                  // 注意：这里需要获取原始文档的索引，而不是过滤后的索引       
                  const originalIndex = documents.findIndex(d => d.key === doc.key);
                  handleDragStart(e, originalIndex);
                  handleDocumentDragStartToMenu(e, doc.key);
                }}
                onDragOver={(e) => {
                  const originalIndex = documents.findIndex(d => d.key === doc.key);
                  handleDragOver(e, originalIndex);
                }}
                onDragEnter={(e) => {
                  const originalIndex = documents.findIndex(d => d.key === doc.key);
                  handleDragEnter(e, originalIndex);
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  const originalIndex = documents.findIndex(d => d.key === doc.key);
                  handleDrop(e, originalIndex);
                }}
                onDragEnd={() => {
                  handleDragEnd();
                  handleMenuDragEnd();
                }}
              >
                <div className="card-header">
                  <Checkbox
                    checked={doc.isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectDocument(doc.key);
                    }}
                    className="doc-checkbox"
                  />
                  <span
                    className="card-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.key);
                    }}
                  >
                    ×
                  </span>
                  {doc.menuCode && doc.menuCode !== '-1' && (
                    <span className="bound-badge">已绑定</span>
                  )}
                </div>
                <div 
                  className="card-image"
                  onClick={() => {
                    if (doc.fullImage) {
                      setPreviewImage(doc.fullImage);
                    }
                  }}
                >
                  {doc.image ? (
                    <img src={doc.image} alt={doc.category} loading="lazy" />
                  ) : (
                    <div className="load-failed">加载失败</div>
                  )}
                </div>
                <div className="card-footer">
                  {doc.fileName ? doc.fileName : doc.category}
                </div>
              </div>
            ))}
          </div>

          <div className="document-footer">
            <Space size="small">
              <span>共：{documents.length}页，</span>
              {selectedMenuKey && (
                <span className="classified-count">
                  当前显示：{filteredDocuments.length}页（绑定到菜单项），
                </span>
              )}
              <span className="classified-count">已分类{classifiedCount}页（蓝色边框），</span>
              <span className="unclassified-count">未分类{unclassifiedCount}页</span>
            </Space>
          </div>
        </Content>
      </Layout>

      {previewImage && (
        <Image.PreviewGroup
          preview={{
            visible: !!previewImage,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewImage(null);
            },
          }}
        >
          <Image src={previewImage} style={{ display: 'none' }} />
        </Image.PreviewGroup>
      )}
    </Layout>
  );
}

export default MedicalRecordScan;
