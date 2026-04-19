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
import './MedicalRecordScan.css';
import * as UTIF from 'utif';
import { getMedicalRecordMenu } from '../api/menuApi';

const { Search } = Input;
const { Content, Sider } = Layout;

/**
 * 将Blob格式的图片转换为DataURL
 * 
 * 功能描述：
 * 1. 接收Blob、ArrayBuffer或base64格式的图片数据
 * 2. 根据图片格式（TIF/TIFF或其他）进行不同处理
 * 3. TIF/TIFF格式使用UTIF库转换为JPEG DataURL
 * 4. 其他格式（JPEG/PNG等）直接转换为DataURL
 * 
 * @param {Blob|ArrayBuffer|string} blobData - Blob、ArrayBuffer或base64格式的图片数据
 * @param {string} fileName - 文件名，用于判断图片格式
 * @param {string} mimeType - MIME类型（可选）
 * @returns {string|null} DataURL格式的图片数据，转换失败返回null
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
        
        // UTIF库使用TIFF标签编号作为字段名
        // t256 = ImageWidth (图像宽度)
        // t257 = ImageLength (图像高度)
        // 这些字段是数组，需要取第一个元素
        const width = ifd.t256?.[0] || ifd.tifw || ifd.width;
        const height = ifd.t257?.[0] || ifd.tifh || ifd.height;
        
        console.log('TIF解析结果:', {
          ifdCount: ifds.length,
          width: width,
          height: height,
          t256: ifd.t256,
          t257: ifd.t257,
          t274: ifd.t274
        });
        
        if (!width || !height) {
          console.error('无法获取图片尺寸，IFD对象:', ifd);
          throw new Error('无法获取TIF图片尺寸');
        }
        
        UTIF.decodeImage(arrayBuffer, ifd);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const rgba = UTIF.toRGBA8(ifd);
        
        console.log('RGBA数据:', {
          length: rgba?.length,
          expectedLength: width * height * 4
        });
        
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
        
        console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
        
        // 转换为JPEG DataURL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        console.log('DataURL生成成功，长度:', dataUrl.length);
        
        return dataUrl;
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
 * 
 * 功能描述：
 * 1. 使用fetch API获取TIF文件的二进制数据
 * 2. 使用UTIF库解析TIF格式，提取图像数据
 * 3. 将TIF图像数据渲染到Canvas上
 * 4. 对图像进行缩放，以适应显示尺寸要求
 * 5. 将Canvas转换为JPEG格式的Data URL，便于在页面上显示
 * 
 * 技术要点：
 * - UTIF库用于处理TIF/TIFF格式，支持多页、压缩等特性
 * - Canvas API用于图像处理和格式转换
 * - Data URL将二进制图像数据转换为可直接在img标签中使用的字符串
 * 
 * @param {string} filePath - TIF文件的路径（相对路径或绝对路径）
 * @returns {string|null} JPEG格式的Data URL，如果加载失败则返回null
 */
const loadTifImage = async (filePath) => {
  try {
    // 第一步：获取TIF文件的二进制数据
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();  // 转换为ArrayBuffer
    
    // 第二步：使用UTIF库解析TIF文件
    // UTIF.decode解析TIF文件，返回IFD（图像文件目录）数组，每个IFD对应一页图像
    const ifds = UTIF.decode(arrayBuffer);
    
    // 检查是否成功解析到图像数据
    if (ifds && ifds.length > 0) {
      const ifd = ifds[0];  // 取第一页图像（TIF可能包含多页）
      UTIF.decodeImage(arrayBuffer, ifd);  // 解码图像数据到ifd对象
      
      // 第三步：创建Canvas并绘制原始TIF图像
      const canvas = document.createElement('canvas');
      canvas.width = ifd.width;     // 设置Canvas宽度为图像宽度
      canvas.height = ifd.height;   // 设置Canvas高度为图像高度
      const ctx = canvas.getContext('2d');
      
      // 将UTIF解码的RGBA数据转换为Canvas可用的ImageData
      const rgba = UTIF.toRGBA8(ifd);  // 获取RGBA格式的像素数据（Uint8Array）
      const imageData = ctx.createImageData(ifd.width, ifd.height);  // 创建ImageData对象
      imageData.data.set(rgba);  // 将RGBA数据复制到ImageData
      ctx.putImageData(imageData, 0, 0);  // 将图像绘制到Canvas上
      
      // 第四步：创建第二个Canvas进行图像缩放
      // 为了优化显示性能，将图像缩放到适合预览的尺寸
      const resizeCanvas = document.createElement('canvas');
      const maxWidth = 400;   // 最大宽度限制
      const maxHeight = 560;  // 最大高度限制
      
      // 计算缩放比例：保持宽高比，不超过最大尺寸，且不放大（ratio ≤ 1）
      let ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
      resizeCanvas.width = Math.floor(canvas.width * ratio);   // 计算缩放后宽度
      resizeCanvas.height = Math.floor(canvas.height * ratio); // 计算缩放后高度
      
      // 在缩放Canvas上绘制已缩放的图像
      const resizeCtx = resizeCanvas.getContext('2d');
      resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height);
      
      // 第五步：将Canvas转换为JPEG格式的Data URL并返回
      // toDataURL参数说明：'image/jpeg'指定格式，0.85指定JPEG压缩质量（0-1）
      return resizeCanvas.toDataURL('image/jpeg', 0.85);
    }
    
    // 如果没有解析到图像数据，抛出错误
    throw new Error('无法解析 TIF 文件');
  } catch (error) {
    // 错误处理：记录错误日志，返回null表示加载失败
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
  const [selectedMenuKey, setSelectedMenuKey] = useState(null); // 新增：当前选中的菜单项 key，用于过滤显示
  const [expandedMenus, setExpandedMenus] = useState(['discharge-related', 'progress-note']);
  const [documents, setDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  // 新增状态：菜单数据
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  // 扫描功能启用状态：当API调用失败时禁用所有扫描功能
  const [scanEnabled, setScanEnabled] = useState(true);
  // 拖拽排序状态
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // 新增：拖拽到菜单的状态
  const [draggedDocumentKey, setDraggedDocumentKey] = useState(null); // 被拖拽到菜单的文档 key

  /**
   * 获取菜单数据的Effect Hook
   * 
   * 功能描述：
   * 1. 组件挂载时自动调用，获取左侧菜单栏数据
   * 2. 尝试调用真实API获取数据，支持多种数据格式
   * 3. 实现错误处理：真实API失败时使用默认数据并禁用扫描功能
   * 4. 管理加载状态和错误状态，提供良好的用户体验
   * 
   * 数据源优先级：
   * 1. 真实API（getMedicalRecordMenu） - 生产环境首选
   * 2. 失败时返回空数据 - API失败时显示未获取到数据
   * 
   * 扫描功能控制：
   * - 真实API成功：启用扫描功能
   * - 真实API失败或数据格式不正确：禁用扫描功能
   * 
   * 依赖项：[] 空数组表示只在组件挂载时执行一次
   */
  useEffect(() => {
    const fetchMenuData = async () => {
      // 初始化状态：开始加载，清除之前的错误
      setMenuLoading(true);
      setMenuError(null);
      
      try {
        // ==================== 第一步：尝试调用真实API ====================
        // 调用真实API获取菜单数据
        const response = await getMedicalRecordMenu();
        
        // API返回格式：{ code: 200, body: [...] }，code为200表示成功
        if (response && response.code === 200 && Array.isArray(response.body)) {
          // 成功获取数据：转换为Ant Design Menu需要的格式
          const formattedMenuItems = formatMenuItems(response.body);
          setMenuItems(formattedMenuItems);
          setScanEnabled(true);  // 启用扫描功能
        } else {
          // API返回数据格式不正确：返回空数据并禁用扫描功能
          console.warn('API返回数据格式不正确，返回空数据', response);
          setMenuItems([]);
          setMenuError('API返回数据格式不正确');
          setScanEnabled(false); // 禁用扫描功能
        }
      } catch (error) {
        // ==================== 第二步：真实API失败，返回空数据并禁用扫描功能 ====================
        console.warn('获取菜单数据失败，返回空数据:', error.message);
        setMenuItems([]);
        setMenuError(`获取菜单失败: ${error.message}`);
        setScanEnabled(false); // 禁用扫描功能
      } finally {
        // ==================== 第四步：无论成功与否，结束加载状态 ====================
        setMenuLoading(false);
      }
    };

    // 执行数据获取函数
    fetchMenuData();
  }, []);  // 空依赖数组：只在组件挂载时执行一次



  /**
   * 格式化菜单项，将API返回的数据转换为Ant Design Menu需要的格式
   * 
   * 功能描述：
   * 1. 数据验证：验证输入是否为有效数组
   * 2. 字段映射：将API字段映射为Ant Design Menu要求的字段（key, label, icon, children）
   * 3. 标签生成：直接使用name字段作为显示标签
   * 4. 图标选择：根据节点是否包含children属性决定使用文件夹图标还是文件图标
   * 5. 递归处理：根据children字段递归格式化所有子菜单项
   * 6. 排序：按照serialNumber或code对菜单项进行排序
   * 
   * 数据处理流程：
   * 1. 输入验证 → 2. 字段映射和格式化 → 3. 递归处理子节点 → 4. 排序 → 5. 返回结果
   * 
   * 关键说明：
   * - 后端返回的数据已经是树形结构，children字段包含子节点数据
   * - parentId字段无需处理，直接忽略
   * - code字段是一个类似于ID的标识符，仅用于排序，不用于标签生成
   * - 区分文件夹和文件的正确方式是：检查节点是否包含children属性（无论是否为空数组）
   *   - 有children属性的节点视为文件夹（使用FolderOutlined图标）
   *   - 没有children属性的节点视为文件（使用FileTextOutlined图标）
   * - 标签生成逻辑：直接使用name字段作为显示标签
   * - 排序逻辑：优先使用serialNumber字段，其次尝试将code解析为数字进行排序
   * 
   * 注意事项：
   * - 空数组处理：输入为空数组时，直接返回空数组
   * - 字段兼容性：支持多种ID字段名（medicalRecordArchiveTpId > id > key）
   * - 错误处理：任何处理失败时，返回空数组
   * 
   * @param {Array} items - API返回的菜单项数组，应为树形结构（包含children字段）
   * @returns {Array} 格式化后的菜单项数组，符合Ant Design Menu组件要求
   */
  const formatMenuItems = (items) => {
    // 参数验证：确保输入是有效的数组
    if (!items || !Array.isArray(items)) {
      return [];  // 返回空数组
    }
    
    // 空数组处理：如果输入为空数组，直接返回空数组
    if (items.length === 0) {
      return [];
    }
    
    // 直接使用items进行格式化：后端返回的数据已经是树形结构，children字段包含子节点数据
    // parentId字段无需处理，直接忽略
    const itemsToFormat = items;  // 待格式化的数据
    
    // 格式化每个菜单项：将 API 数据结构转换为 Ant Design Menu 数据结构
    const formattedItems = itemsToFormat.map(item => {
      // 字段映射：API 返回的字段名可能不同，统一映射为标准字段
      // 唯一标识符，转换为字符串以确保类型一致性
      const key = String(item.medicalRecordArchiveTpId || item.id || item.key);
      const name = item.name || item.label || '未命名';                 // 显示名称
      const code = item.code;  // 保存原始 code 字段，用于绑定
      
      // 生成显示标签：直接使用 name
      let label = name;
      
      // 处理子菜单：如果存在 children 属性且为数组，则递归格式化
      let children = null;
      const hasChildrenProperty = item.children !== undefined && Array.isArray(item.children);
      
      if (hasChildrenProperty) {
        // 递归格式化子节点，即使 item.children 为空数组也会处理
        children = formatMenuItems(item.children);
      }
      
      // 根据是否包含 children 属性确定图标类型
      // 规则：有 children 属性的节点视为文件夹，没有 children 属性的节点视为文件
      const icon = hasChildrenProperty ? <FolderOutlined /> : <FileTextOutlined />;
      
      // 构建格式化后的菜单项，符合 Ant Design Menu 组件要求
      const formattedItem = {
        key: key,      // 菜单项的唯一标识
        label: (       // 自定义渲染 label，添加拖拽放置功能
          <div
            onDragOver={handleMenuDragOver}
            onDragEnter={handleMenuDragEnter}
            onDragLeave={handleMenuDragLeave}
            onDrop={(e) => handleMenuDrop(e, key, code)}
            onDragEnd={handleMenuDragEnd}
            style={{ width: '100%' }}
          >
            {label}
          </div>
        ),
        icon: icon
      };
      
      // 保存原始 code 到 item 中（用于拖拽放置时获取）
      formattedItem.code = code;
      
      // 如果有 children 属性（无论是否为空数组），都添加到格式化后的菜单项中
      if (hasChildrenProperty) {
        formattedItem.children = children;
      }
      
      return formattedItem;
    });
    
    // 对格式化后的菜单项进行排序（按serialNumber或code）
    // 排序规则：优先使用serialNumber字段，其次使用code字段
    return formattedItems.sort((a, b) => {
      // 从原始数据中获取排序字段（因为格式化后的数据可能丢失了原始字段）
      const originalA = items.find(item => 
        String(item.medicalRecordArchiveTpId || item.id || item.key) === a.key
      );
      const originalB = items.find(item => 
        String(item.medicalRecordArchiveTpId || item.id || item.key) === b.key
      );
      
      if (!originalA || !originalB) return 0;  // 如果找不到原始数据，保持原顺序
      
      // 优先使用serialNumber，其次使用code
      const aNum = originalA.serialNumber !== undefined ? originalA.serialNumber : 
                  parseInt(originalA.code) || parseFloat(originalA.code) || 0;
      const bNum = originalB.serialNumber !== undefined ? originalB.serialNumber : 
                  parseInt(originalB.code) || parseFloat(originalB.code) || 0;
      
      return aNum - bNum;  // 升序排序
    });
  };

  const selectedCount = documents.filter(doc => doc.isSelected).length;
  const classifiedCount = documents.filter(doc => doc.isClassified).length;
  const unclassifiedCount = documents.length - classifiedCount;

  // 新增：计算每个菜单项绑定的图片数量
  const getBoundCountForMenu = (menuCode) => {
    return documents.filter(doc => doc.menuCode === menuCode).length;
  };

  // 新增：根据选中的菜单过滤显示的文档
  const filteredDocuments = selectedMenuKey
    ? documents.filter(doc => doc.menuCode === selectedMenuKey)
    : documents;

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
    setDraggedIndex(index);                     // 记录被拖拽元素的索引
    e.dataTransfer.effectAllowed = 'move';      // 设置拖拽操作为移动
    e.dataTransfer.setData('text/plain', index); // 存储拖拽数据（索引）
    
    // 异步添加拖拽样式，确保DOM已更新
    setTimeout(() => {
      const draggedElement = e.target.closest('.document-card');
      if (draggedElement) {
        draggedElement.classList.add('dragging');  // 添加拖拽中的CSS类
      }
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
    e.preventDefault();                         // 必须调用，否则drop事件不会触发
    e.dataTransfer.dropEffect = 'move';         // 设置拖拽视觉效果
    
    // 如果悬停位置不是被拖拽元素本身，则更新dragOverIndex状态
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
    e.preventDefault();  // 必须调用，否则drop事件不会触发
    
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
    // 检查拖拽是否离开到当前元素的子元素
    // 如果relatedTarget是当前元素的子元素，说明拖拽仍在当前元素内部
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverIndex(null);  // 拖拽真正离开了当前元素，清除悬停状态
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
    e.preventDefault();  // 必须调用，防止浏览器默认行为
    
    // 检查放置位置是否有效：不能是拖拽元素本身，也不能没有拖拽元素
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();  // 清理拖拽状态
      return;
    }

    // 重新排序文档：使用不可变方式更新数组
    const newDocuments = [...documents];                 // 创建文档数组的副本
    const draggedItem = newDocuments[draggedIndex];      // 获取被拖拽的元素
    newDocuments.splice(draggedIndex, 1);                // 从原位置移除
    newDocuments.splice(dropIndex, 0, draggedItem);      // 插入到新位置

    setDocuments(newDocuments);                          // 更新状态
    message.success(`已将图片移动到第 ${dropIndex + 1} 位`);  // 用户反馈

    handleDragEnd();  // 清理拖拽状态
  };

  /**
   * 处理拖拽结束事件（无论拖拽是否成功都会触发）
   * 
   * 功能描述：
   * 1. 重置拖拽相关状态（draggedIndex和dragOverIndex）
   * 2. 移除所有拖拽相关的CSS样式类
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);    // 清除被拖拽元素索引
    setDragOverIndex(null);   // 清除悬停元素索引
    
    // 移除所有拖拽相关的 CSS 样式类
    document.querySelectorAll('.document-card.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.document-card.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  };

  // ==================== 拖拽到菜单处理函数 ====================
  /**
   * 处理文档拖拽到菜单的开始事件
   *
   * 功能描述：
   * 1. 记录被拖拽的文档 key
   * 2. 设置拖拽操作类型为'copy'（复制/绑定）
   * 3. 将拖拽数据存储在 dataTransfer 对象中
   *
   * @param {DragEvent} e - HTML5 拖拽事件对象
   * @param {string} docKey - 被拖拽文档的 key
   */
  const handleDocumentDragStartToMenu = (e, docKey) => {
    setDraggedDocumentKey(docKey);                    // 记录被拖拽文档的 key
    e.dataTransfer.effectAllowed = 'copy';            // 设置拖拽操作为复制/绑定
    e.dataTransfer.setData('text/plain', docKey);     // 存储拖拽数据（文档 key）

    // 异步添加拖拽样式，确保 DOM 已更新
    setTimeout(() => {
      const draggedElement = e.target.closest('.document-card');
      if (draggedElement) {
        draggedElement.classList.add('dragging');     // 添加拖拽中的 CSS 类
      }
    }, 0);
  };

  /**
   * 处理菜单项拖拽悬停事件（文档被拖拽到菜单项上方时持续触发）
   *
   * 功能描述：
   * 1. 阻止浏览器默认行为
   * 2. 设置拖拽视觉效果为'copy'
   *
   * @param {DragEvent} e - HTML5 拖拽事件对象
   */
  const handleMenuDragOver = (e) => {
    e.preventDefault();                              // 必须调用，否则 drop 事件不会触发
    e.dataTransfer.dropEffect = 'copy';              // 设置拖拽视觉效果为复制

    // 添加菜单项悬停样式
    const menuItem = e.currentTarget;
    if (menuItem) {
      menuItem.classList.add('menu-drop-target');
    }
  };

  /**
   * 处理菜单项拖拽进入事件（文档首次进入菜单项区域时触发）
   *
   * 功能描述：
   * 1. 阻止浏览器默认行为
   *
   * @param {DragEvent} e - HTML5 拖拽事件对象
   */
  const handleMenuDragEnter = (e) => {
    e.preventDefault();                              // 必须调用，否则 drop 事件不会触发
  };

  /**
   * 处理菜单项拖拽离开事件（文档离开菜单项区域时触发）
   *
   * 功能描述：
   * 1. 检查拖拽是否真正离开了当前菜单项
   *
   * @param {DragEvent} e - HTML5 拖拽事件对象
   */
  const handleMenuDragLeave = (e) => {
    // 检查拖拽是否离开到当前元素的子元素
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) {
      // 移除菜单项悬停样式
      const menuItem = e.currentTarget;
      if (menuItem) {
        menuItem.classList.remove('menu-drop-target');
      }
    }
  };

  /**
   * 处理菜单项拖拽放置事件（文档被释放到菜单项上时触发）
   *
   * 功能描述：
   * 1. 阻止浏览器默认行为
   * 2. 检查放置位置是否有效（是否有被拖拽文档）
   * 3. 绑定文档到菜单项（获取菜单的 code 值）
   * 4. 更新文档的 menuCode 字段
   * 5. 显示成功消息
   * 6. 清理拖拽状态
   *
   * @param {DragEvent} e - HTML5 拖拽事件对象
   * @param {string} menuKey - 放置位置的菜单项 key
   * @param {string} menuCode - 菜单项的 code 值
   */
  const handleMenuDrop = (e, menuKey, menuCode) => {
    e.preventDefault();                              // 必须调用，防止浏览器默认行为

    // 检查放置位置是否有效：必须有被拖拽的文档
    if (!draggedDocumentKey) {
      handleMenuDragEnd();                           // 清理拖拽状态
      return;
    }

    // 绑定文档到菜单项：更新文档的 menuCode 字段
    setDocuments(docs => docs.map(doc =>
      doc.key === draggedDocumentKey
        ? { ...doc, menuCode: menuCode || '-1' }     // 使用菜单的 code，如果没有则使用默认值 -1
        : doc
    ));

    message.success(`已将图片绑定到菜单项`);           // 用户反馈

    handleMenuDragEnd();                             // 清理拖拽状态
  };

  /**
   * 处理菜单项拖拽结束事件（无论拖拽是否成功都会触发）
   *
   * 功能描述：
   * 1. 重置菜单拖拽相关状态
   * 2. 移除所有菜单拖拽相关的 CSS 样式类
   */
  const handleMenuDragEnd = () => {
    setDraggedDocumentKey(null);                     // 清除被拖拽文档 key

    // 移除所有菜单拖拽相关的 CSS 样式类
    document.querySelectorAll('.ant-menu-item.menu-drop-target').forEach(el => {
      el.classList.remove('menu-drop-target');
    });
    document.querySelectorAll('.document-card.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
  };

  const handleMenuOpenChange = (keys) => {
    setExpandedMenus(keys);
  };

  const handleMenuClick = ({ key }) => {
    setSelectedMenu(key);
    // 新增：点击菜单时设置选中的菜单 key，用于过滤显示
    setSelectedMenuKey(key);
  };

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
   * 开始扫描处理函数
   * 
   * 功能描述：
   * 1. 检查是否正在扫描，避免重复操作
   * 2. 连接WebSocket服务器执行扫描操作
   * 3. 接收Blob格式的图片数据并转换为可显示的格式
   * 4. 更新扫描进度和状态
   */
  const handleStartScan = async () => {
    if (isScanning) {
      message.warning('正在扫描中，请稍候...');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    message.info('开始扫描...');

    // 尝试连接WebSocket并获取图片数据
    try {
      // 连接WebSocket服务器
      const ws = new WebSocket('ws://localhost:8080');
      
      // 设置接收二进制数据为Blob格式
      ws.binaryType = 'blob';
      
      // 等待连接建立
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('WebSocket连接成功');
          resolve();
        };
        ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          reject(new Error('WebSocket连接失败'));
        };
        ws.onclose = () => {
          reject(new Error('WebSocket连接被关闭'));
        };
      });

      // 发送空参数调用方法，接收Blob格式的图片数据
      const imagesData = await new Promise((resolve, reject) => {
        const receivedImages = [];
        let timeoutId = null;
        let closeReceived = false;

        const messageHandler = (event) => {
          console.log('收到消息:', event.data);
          
          // 处理文本消息 - 检查是否是完成信号
          if (typeof event.data === 'string') {
            const text = event.data.toLowerCase();
            if (text.includes('completed') || text.includes('finished') || text.includes('done')) {
              console.log(`收到完成信号，已接收 ${receivedImages.length} 张图片`);
              clearTimeout(timeoutId);
              closeReceived = true;
              resolve(receivedImages);
            }
            return;
          }
          
          // 直接接收Blob格式的图片数据
          if (event.data instanceof Blob) {
            const blob = event.data;
            const imageIndex = receivedImages.length;
            const fileName = `image-${imageIndex}.tiff`;
            
            receivedImages.push({
              blob: blob,
              fileName: fileName
            });
            
            console.log(`已接收图片 ${imageIndex + 1}，大小: ${(blob.size / 1024).toFixed(2)} KB`);
            
            // 更新进度（临时显示）
            setScanProgress(Math.min(90, receivedImages.length * 10));
          }
        };
        
        ws.onmessage = messageHandler;
        
        // 监听连接关闭事件，表示数据传输完成
        ws.onclose = () => {
          closeReceived = true;
          clearTimeout(timeoutId);
          console.log(`数据传输完成，共接收 ${receivedImages.length} 张图片`);
          resolve(receivedImages);
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeoutId);
          reject(new Error('WebSocket接收图片时发生错误'));
        };
        
        // 设置超时处理（60秒）
        timeoutId = setTimeout(() => {
          if (!closeReceived) {
            ws.close();
            reject(new Error('接收图片超时'));
          }
        }, 60000);
        
        // 发送空参数调用方法
        const params = JSON.stringify({
          "ColorMode": "黑白",
          "Resolution": 600,
          "ShowInterface": false,
          "UseFeeder": true,
          "IsDuplex": true
        });
        ws.send(`startScan:${params}`);
      });

      message.info('图片数据接收完成');

      // 使用接收到的图片数据创建文档
      try {
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
              isClassified: false,
              menuCode: '-1'  // 新增：默认绑定到未编制目录（code=-1）
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
        message.error('处理图片数据失败');
      }
    } catch (error) {
      console.warn('WebSocket连接或操作失败:', error);
      message.warning('WebSocket连接失败，扫描已取消');
      setIsScanning(false);
      return;
    }
  };



  /**
   * 插入页面处理函数
   * 
   * 功能描述：
   * 1. 检查是否有选中的图片
   * 2. 加载1.tiff作为插入图片
   * 3. 在每张选中图片后插入新图片
   * 4. 更新文档列表并显示成功消息
   */
  const handleInsertPage = async () => {
    const selectedDocs = documents.filter(doc => doc.isSelected);
    if (selectedDocs.length === 0) {
      message.warning('请先选择要在其后插入的图片');
      return;
    }

    try {
      const filePath = `/sample-tiffs/1.tiff`;
      const imageUrl = await loadTifImage(filePath);
      
      if (!imageUrl) {
        message.error('加载 1.tiff 失败');
        return;
      }

      const newDocument = {
        key: `tif-insert-${Date.now()}`,
        order: documents.length + 1,
        category: '插入页面',
        image: imageUrl,
        fullImage: imageUrl,
        fileName: '1.tiff',
        isSelected: false,
        isClassified: false
      };

      const newDocuments = [...documents];
      selectedDocs.forEach(doc => {
        const index = newDocuments.findIndex(d => d.key === doc.key);
        if (index !== -1) {
          newDocuments.splice(index + 1, 0, { ...newDocument, key: `tif-insert-${Date.now()}-${index}` });
        }
      });

      setDocuments(newDocuments);
      message.success(`成功插入 ${selectedDocs.length} 张图片`);
    } catch (error) {
      console.error('插描失败:', error);
      message.error('插描失败');
    }
  };

  /**
   * 替扫处理函数（替换扫描）
   * 
   * 功能描述：
   * 1. 检查是否只选中一张图片
   * 2. 加载1.tiff作为替换图片
   * 3. 替换选中图片的内容
   * 4. 更新文档列表并显示成功消息
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
      const filePath = `/sample-tiffs/1.tiff`;
      const imageUrl = await loadTifImage(filePath);
      
      if (!imageUrl) {
        message.error('加载 1.tiff 失败');
        return;
      }

      const selectedDoc = selectedDocs[0];
      setDocuments(docs => docs.map(doc => 
        doc.key === selectedDoc.key 
          ? {
              ...doc,
              image: imageUrl,
              fullImage: imageUrl,
              fileName: '1.tiff',
              isClassified: false
            }
          : doc
      ));

      message.success('替扫成功');
    } catch (error) {
      console.error('替扫失败:', error);
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
                onClick={handleStartScan}
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
            {filteredDocuments.map((doc, index) => {
              // 获取原始索引（用于拖拽排序）
              const originalIndex = documents.findIndex(d => d.key === doc.key);
              
              return (
                <div
                  key={doc.key}
                  className={`document-card ${doc.isSelected ? 'selected' : ''} ${doc.isClassified ? 'classified' : ''} ${draggedIndex === originalIndex ? 'dragging' : ''} ${dragOverIndex === originalIndex ? 'drag-over' : ''} ${doc.menuCode && doc.menuCode !== '-1' ? 'bound' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    // 同时支持两种拖拽：排序和绑定到菜单
                    handleDragStart(e, originalIndex);
                    handleDocumentDragStartToMenu(e, doc.key);
                  }}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDragEnter={(e) => handleDragEnter(e, originalIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, originalIndex)}
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
              );
            })}
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
