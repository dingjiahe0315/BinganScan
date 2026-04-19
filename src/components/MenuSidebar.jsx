import { Menu, Spin } from 'antd';

function MenuSidebar({
  menuItems,
  menuLoading,
  menuError,
  selectedMenuKey,
  selectedMenu,
  expandedMenus,
  onMenuOpenChange,
  onMenuClick,
}) {
  return (
    <div className="left-sidebar">
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
          onOpenChange={onMenuOpenChange}
          onClick={onMenuClick}
          items={menuItems}
        />
      )}
    </div>
  );
}

export default MenuSidebar;
